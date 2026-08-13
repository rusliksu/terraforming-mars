#!/usr/bin/env python3
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import json
import os
from pathlib import Path
import re
import stat
import sys
import time
from typing import Any, Iterator
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin, urlparse
from urllib.request import Request, urlopen


ORGANIZATION = "ruslan-gayanov"
PROJECT = "terraforming-mars-staging"
REPOSITORY = "rusliksu/terraforming-mars"
ENVIRONMENT = "staging"
API_BASE_URL = "https://sentry.io/api/0/"
CONFIG_ROOT = Path.home() / ".config"
TOKEN_FILE = CONFIG_ROOT / "tm-sentry-release.env"
RUNTIME_FILE = CONFIG_ROOT / "tm-server.env"
LOCK_FILE = CONFIG_ROOT / "tm-sentry-release.lock"
TOKEN_LINE = re.compile(r"^[ \t]*SENTRY_AUTH_TOKEN[ \t]*=(.*)$")
FULL_SHA = re.compile(r"^[0-9a-f]{40}$")


class ReleaseTrackingError(RuntimeError):
    pass


def _metadata_safe_file(path: Path, *, allow_missing: bool = False) -> os.stat_result | None:
    try:
        metadata = path.stat(follow_symlinks=False)
    except FileNotFoundError:
        if allow_missing:
            return None
        raise ReleaseTrackingError(f"Required configuration file is missing: {path}") from None
    if not stat.S_ISREG(metadata.st_mode):
        raise ReleaseTrackingError(f"Configuration path is not a regular file: {path}")
    if hasattr(os, "getuid") and metadata.st_uid != os.getuid():
        raise ReleaseTrackingError(f"Configuration file has an unexpected owner: {path}")
    if os.name == "posix" and stat.S_IMODE(metadata.st_mode) != 0o600:
        raise ReleaseTrackingError(f"Configuration file must have mode 600: {path}")
    return metadata


def _token_values(path: Path) -> list[str]:
    values: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        match = TOKEN_LINE.match(line)
        if match is not None:
            values.append(match.group(1))
    return values


def preflight(token_file: Path = TOKEN_FILE, runtime_file: Path = RUNTIME_FILE) -> str:
    _metadata_safe_file(token_file)
    _metadata_safe_file(runtime_file)
    token_values = _token_values(token_file)
    if len(token_values) != 1 or token_values[0] == "" or any(ch.isspace() for ch in token_values[0]):
        raise ReleaseTrackingError("Deploy-only configuration must contain exactly one non-empty SENTRY_AUTH_TOKEN.")
    if _token_values(runtime_file):
        raise ReleaseTrackingError("Runtime configuration must not contain SENTRY_AUTH_TOKEN.")
    return token_values[0]


@contextlib.contextmanager
def exclusive_lock(path: Path = LOCK_FILE) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    flags = os.O_RDWR | os.O_CREAT
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = os.open(path, flags, 0o600)
    locked = False
    try:
        metadata = os.fstat(descriptor)
        if not stat.S_ISREG(metadata.st_mode):
            raise ReleaseTrackingError(f"Lock path is not a regular file: {path}")
        if hasattr(os, "getuid") and metadata.st_uid != os.getuid():
            raise ReleaseTrackingError(f"Lock file has an unexpected owner: {path}")
        if os.name == "posix":
            import fcntl

            os.fchmod(descriptor, 0o600)
            fcntl.flock(descriptor, fcntl.LOCK_EX)
        else:
            import msvcrt

            if metadata.st_size == 0:
                os.write(descriptor, b"0")
            os.lseek(descriptor, 0, os.SEEK_SET)
            msvcrt.locking(descriptor, msvcrt.LK_LOCK, 1)
        locked = True
        yield
    finally:
        if locked and os.name == "posix":
            import fcntl

            fcntl.flock(descriptor, fcntl.LOCK_UN)
        elif locked:
            import msvcrt

            os.lseek(descriptor, 0, os.SEEK_SET)
            msvcrt.locking(descriptor, msvcrt.LK_UNLCK, 1)
        os.close(descriptor)


class SentryApi:
    def __init__(self, token: str, base_url: str = API_BASE_URL) -> None:
        self._token = token
        self._base_url = base_url.rstrip("/") + "/"
        self._base_origin = urlparse(self._base_url)

    def _url(self, resource: str) -> str:
        url = resource if resource.startswith(("http://", "https://")) else urljoin(self._base_url, resource.lstrip("/"))
        parsed = urlparse(url)
        if parsed.scheme != self._base_origin.scheme or parsed.netloc != self._base_origin.netloc:
            raise ReleaseTrackingError("Sentry pagination attempted to leave the configured API origin.")
        return url

    def request(
        self,
        method: str,
        resource: str,
        payload: dict[str, Any] | None = None,
        expected: tuple[int, ...] = (200,),
    ) -> tuple[int, Any, dict[str, Any]]:
        url = self._url(resource)
        body = None if payload is None else json.dumps(payload, separators=(",", ":")).encode("utf-8")
        request = Request(
            url,
            data=body,
            method=method,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self._token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=30) as response:
                status_code = response.status
                response_body = response.read()
                headers = response.headers
        except HTTPError as error:
            raise ReleaseTrackingError(f"Sentry API {method} request failed with HTTP {error.code}.") from None
        except URLError as error:
            raise ReleaseTrackingError(f"Sentry API {method} request failed: {error.reason}.") from None
        if status_code not in expected:
            raise ReleaseTrackingError(f"Sentry API {method} request returned unexpected HTTP {status_code}.")
        if response_body:
            try:
                parsed = json.loads(response_body)
            except json.JSONDecodeError:
                raise ReleaseTrackingError("Sentry API returned invalid JSON.") from None
        else:
            parsed = {}
        return status_code, headers, parsed


def _release_resource(release: str) -> str:
    return f"organizations/{quote(ORGANIZATION, safe='')}/releases/{quote(release, safe='')}/"


def _project_slugs(release_payload: dict[str, Any]) -> set[str]:
    projects = release_payload.get("projects")
    if not isinstance(projects, list):
        return set()
    return {
        project.get("slug")
        for project in projects
        if isinstance(project, dict) and isinstance(project.get("slug"), str)
    }


def ensure_release(api: SentryApi, release: str) -> str:
    create_payload = {
        "version": release,
        "projects": [PROJECT],
        "refs": [{"repository": REPOSITORY, "commit": release}],
    }
    status_code, _, _ = api.request(
        "POST",
        f"organizations/{quote(ORGANIZATION, safe='')}/releases/",
        create_payload,
        (201, 208),
    )
    _, _, existing = api.request("GET", _release_resource(release))
    if existing.get("version") != release or _project_slugs(existing) != {PROJECT}:
        raise ReleaseTrackingError("Existing Sentry release is incompatible with the expected project.")
    api.request(
        "PUT",
        _release_resource(release),
        {"refs": [{"repository": REPOSITORY, "commit": release}]},
        (200,),
    )
    return "created" if status_code == 201 else "existing"


def _next_page(headers: Any) -> str | None:
    link_header = headers.get("Link")
    if not link_header:
        return None
    for part in re.split(r",(?=\s*<)", link_header):
        match = re.match(r"\s*<([^>]+)>;(.*)$", part)
        if match is None:
            continue
        attributes = match.group(2)
        if re.search(r'\brel="next"', attributes) and re.search(r'\bresults="true"', attributes):
            return match.group(1)
    return None


def find_environment_deploy(api: SentryApi, release: str) -> dict[str, Any] | None:
    resource: str | None = _release_resource(release) + "deploys/"
    while resource is not None:
        _, headers, payload = api.request("GET", resource)
        if not isinstance(payload, list):
            raise ReleaseTrackingError("Sentry deploy list returned an incompatible response.")
        for deploy in payload:
            if isinstance(deploy, dict) and deploy.get("environment") == ENVIRONMENT:
                return deploy
        resource = _next_page(headers)
    return None


def ensure_deploy(api: SentryApi, release: str, started_at: str, finished_at: str) -> str:
    if find_environment_deploy(api, release) is not None:
        return "existing"
    api.request(
        "POST",
        _release_resource(release) + "deploys/",
        {
            "environment": ENVIRONMENT,
            "name": "tm-staging",
            "projects": [PROJECT],
            "dateStarted": started_at,
            "dateFinished": finished_at,
        },
        (201,),
    )
    return "created"


def _parse_timestamp(value: str, name: str) -> str:
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ReleaseTrackingError(f"{name} must be an ISO-8601 timestamp.") from None
    if parsed.tzinfo is None:
        raise ReleaseTrackingError(f"{name} must include a timezone.")
    return parsed.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def report_release(
    release: str,
    started_at: str,
    finished_at: str,
    *,
    token_file: Path = TOKEN_FILE,
    runtime_file: Path = RUNTIME_FILE,
    lock_file: Path = LOCK_FILE,
    api_base_url: str = API_BASE_URL,
    hold_lock_seconds: float = 0,
) -> tuple[str, str]:
    if FULL_SHA.fullmatch(release) is None:
        raise ReleaseTrackingError("Release must be a lowercase full 40-character git SHA.")
    normalized_started = _parse_timestamp(started_at, "started-at")
    normalized_finished = _parse_timestamp(finished_at, "finished-at")
    parsed_started = dt.datetime.fromisoformat(normalized_started.replace("Z", "+00:00"))
    parsed_finished = dt.datetime.fromisoformat(normalized_finished.replace("Z", "+00:00"))
    if parsed_finished < parsed_started:
        raise ReleaseTrackingError("finished-at cannot be earlier than started-at.")
    token = preflight(token_file, runtime_file)
    with exclusive_lock(lock_file):
        if hold_lock_seconds > 0:
            time.sleep(hold_lock_seconds)
        api = SentryApi(token, api_base_url)
        release_result = ensure_release(api, release)
        deploy_result = ensure_deploy(api, release, normalized_started, normalized_finished)
    return release_result, deploy_result


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preflight-only", action="store_true")
    parser.add_argument("--release")
    parser.add_argument("--started-at")
    parser.add_argument("--finished-at")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        if args.preflight_only:
            preflight()
            print("sentry_preflight=PASS token_file_mode=600 runtime_token_lines=0")
            return 0
        if args.release is None or args.started_at is None or args.finished_at is None:
            raise ReleaseTrackingError("release, started-at and finished-at are required.")
        release_result, deploy_result = report_release(args.release, args.started_at, args.finished_at)
        print(f"sentry_release={release_result} version={args.release} project={PROJECT}")
        print(f"sentry_deploy={deploy_result} environment={ENVIRONMENT}")
        return 0
    except ReleaseTrackingError as error:
        print(f"sentry_release_tracking=FAILED reason={error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
