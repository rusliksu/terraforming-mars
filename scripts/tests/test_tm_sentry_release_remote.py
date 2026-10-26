from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import contextlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest


MODULE_PATH = Path(__file__).parents[1] / "lib" / "tm_sentry_release_remote.py"
SPEC = importlib.util.spec_from_file_location("tm_sentry_release_remote", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

SHA = "0123456789abcdef0123456789abcdef01234567"
STARTED = "2026-08-13T07:00:00Z"
FINISHED = "2026-08-13T07:01:00Z"


def write_private(path: Path, value: str) -> None:
    path.write_text(value, encoding="utf-8")
    os.chmod(path, 0o600)


class FakeApi:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, object]] = []
        self.deploy_page = 0

    def request(self, method: str, resource: str, payload=None, expected=(200,)):
        self.calls.append((method, resource, payload))
        if method == "POST" and resource.endswith("/releases/"):
            return 201, {}, {"version": SHA}
        if method == "GET" and resource.endswith(f"/releases/{SHA}/"):
            return 200, {}, {"version": SHA, "projects": [{"slug": MODULE.PROJECT}]}
        if method == "PUT":
            return 200, {}, {"version": SHA}
        if method == "GET" and resource.endswith("/deploys/"):
            self.deploy_page += 1
            return 200, {"Link": '<https://fake.invalid/page-2>; rel="next"; results="true"'}, []
        if method == "GET" and resource == "https://fake.invalid/page-2":
            return 200, {"Link": '<https://fake.invalid/page-3>; rel="next"; results="false"'}, [
                {"environment": MODULE.ENVIRONMENT, "id": "existing"}
            ]
        raise AssertionError((method, resource, payload, expected))


class ConcurrentApi:
    state_lock = threading.Lock()
    deploy_exists = False
    deploy_creates = 0
    active_requests = 0
    max_active_requests = 0

    def __init__(self, _token: str, _base_url: str) -> None:
        pass

    def request(self, method: str, resource: str, payload=None, expected=(200,)):
        with self.state_lock:
            type(self).active_requests += 1
            type(self).max_active_requests = max(type(self).max_active_requests, type(self).active_requests)
        try:
            time.sleep(0.01)
            if method == "POST" and resource.endswith("/releases/"):
                return 208, {}, {}
            if method == "GET" and resource.endswith(f"/releases/{SHA}/"):
                return 200, {}, {"version": SHA, "projects": [{"slug": MODULE.PROJECT}]}
            if method == "PUT":
                return 200, {}, {}
            if method == "GET" and resource.endswith("/deploys/"):
                with self.state_lock:
                    exists = type(self).deploy_exists
                return 200, {}, ([{"environment": MODULE.ENVIRONMENT}] if exists else [])
            if method == "POST" and resource.endswith("/deploys/"):
                with self.state_lock:
                    type(self).deploy_creates += 1
                    type(self).deploy_exists = True
                return 201, {}, {}
            raise AssertionError((method, resource, payload, expected))
        finally:
            with self.state_lock:
                type(self).active_requests -= 1


class RecordingHandler(BaseHTTPRequestHandler):
    requests: list[dict[str, object]] = []
    deploy_exists = False

    def log_message(self, _format: str, *_args: object) -> None:
        pass

    def _request_payload(self) -> object:
        size = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(size)) if size else None

    def _send(self, status: int, payload: object) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _record(self) -> object:
        payload = self._request_payload()
        type(self).requests.append({
            "authorization": self.headers.get("Authorization"),
            "method": self.command,
            "path": self.path,
            "payload": payload,
        })
        return payload

    def do_POST(self) -> None:
        self._record()
        if self.path.endswith("/releases/"):
            self._send(201, {"version": SHA})
        elif self.path.endswith("/deploys/"):
            type(self).deploy_exists = True
            self._send(201, {"environment": MODULE.ENVIRONMENT})
        else:
            self._send(404, {})

    def do_GET(self) -> None:
        self._record()
        if self.path.endswith(f"/releases/{SHA}/"):
            self._send(200, {"version": SHA, "projects": [{"slug": MODULE.PROJECT}]})
        elif self.path.endswith("/deploys/"):
            deploys = [{"environment": MODULE.ENVIRONMENT}] if type(self).deploy_exists else []
            self._send(200, deploys)
        else:
            self._send(404, {})

    def do_PUT(self) -> None:
        self._record()
        self._send(200, {"version": SHA})


class TmSentryReleaseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.token_file = self.root / "tm-sentry-release.env"
        self.runtime_file = self.root / "tm-server.env"
        self.lock_file = self.root / "tm-sentry-release.lock"
        write_private(self.token_file, "SENTRY_AUTH_TOKEN=private-test-value\n")
        write_private(self.runtime_file, "SENTRY_DSN=https://public@example.invalid/1\nSENTRY_ENVIRONMENT=staging\n")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_preflight_requires_isolated_token_and_private_files(self) -> None:
        self.assertEqual(
            MODULE.preflight(self.token_file, self.runtime_file),
            "private-test-value",
        )
        write_private(self.runtime_file, "SENTRY_AUTH_TOKEN=must-not-be-runtime\n")
        with self.assertRaises(MODULE.ReleaseTrackingError):
            MODULE.preflight(self.token_file, self.runtime_file)

        if os.name == "posix":
            write_private(self.runtime_file, "SENTRY_ENVIRONMENT=staging\n")
            os.chmod(self.token_file, 0o644)
            with self.assertRaises(MODULE.ReleaseTrackingError):
                MODULE.preflight(self.token_file, self.runtime_file)

    def test_release_201_and_paginated_existing_deploy(self) -> None:
        api = FakeApi()
        self.assertEqual(MODULE.ensure_release(api, SHA), "created")
        self.assertEqual(MODULE.ensure_deploy(api, SHA, STARTED, FINISHED), "existing")
        self.assertTrue(any(call[0] == "PUT" and call[2] == {
            "refs": [{"repository": MODULE.REPOSITORY, "commit": SHA}]
        } for call in api.calls))
        self.assertFalse(any(call[0] == "POST" and call[1].endswith("/deploys/") for call in api.calls))

    def test_release_208_rejects_incompatible_project(self) -> None:
        class IncompatibleApi:
            def request(self, method, resource, payload=None, expected=(200,)):
                if method == "POST":
                    return 208, {}, {}
                return 200, {}, {"version": SHA, "projects": [{"slug": "wrong-project"}]}

        with self.assertRaises(MODULE.ReleaseTrackingError):
            MODULE.ensure_release(IncompatibleApi(), SHA)

        class AdditionalProjectApi:
            def request(self, method, resource, payload=None, expected=(200,)):
                if method == "POST":
                    return 208, {}, {}
                return 200, {}, {
                    "version": SHA,
                    "projects": [{"slug": MODULE.PROJECT}, {"slug": "unrelated-project"}],
                }

        with self.assertRaises(MODULE.ReleaseTrackingError):
            MODULE.ensure_release(AdditionalProjectApi(), SHA)

    def test_api_refuses_cross_origin_pagination(self) -> None:
        api = MODULE.SentryApi("private-test-value", "https://sentry.example.invalid/api/0/")
        with self.assertRaises(MODULE.ReleaseTrackingError):
            api._url("https://attacker.example.invalid/api/0/next")

    def test_real_http_client_sends_expected_release_and_deploy_contract(self) -> None:
        RecordingHandler.requests = []
        RecordingHandler.deploy_exists = False
        server = ThreadingHTTPServer(("127.0.0.1", 0), RecordingHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            release_result, deploy_result = MODULE.report_release(
                SHA,
                STARTED,
                FINISHED,
                token_file=self.token_file,
                runtime_file=self.runtime_file,
                lock_file=self.lock_file,
                api_base_url=f"http://127.0.0.1:{server.server_port}/api/0/",
            )
        finally:
            server.shutdown()
            thread.join(timeout=5)
            server.server_close()

        self.assertEqual((release_result, deploy_result), ("created", "created"))
        self.assertEqual(
            [request["method"] for request in RecordingHandler.requests],
            ["POST", "GET", "PUT", "GET", "POST"],
        )
        self.assertTrue(all(
            request["authorization"] == "Bearer private-test-value"
            for request in RecordingHandler.requests
        ))
        release_payload = RecordingHandler.requests[0]["payload"]
        self.assertEqual(release_payload, {
            "version": SHA,
            "projects": [MODULE.PROJECT],
            "refs": [{"repository": MODULE.REPOSITORY, "commit": SHA}],
        })
        deploy_payload = RecordingHandler.requests[-1]["payload"]
        self.assertEqual(deploy_payload["environment"], MODULE.ENVIRONMENT)
        self.assertEqual(deploy_payload["projects"], [MODULE.PROJECT])

    def test_concurrent_runs_share_one_lock_and_create_one_deploy(self) -> None:
        original_api = MODULE.SentryApi
        ConcurrentApi.deploy_exists = False
        ConcurrentApi.deploy_creates = 0
        ConcurrentApi.active_requests = 0
        ConcurrentApi.max_active_requests = 0
        write_private(self.lock_file, "0")
        MODULE.SentryApi = ConcurrentApi
        try:
            def invoke():
                return MODULE.report_release(
                    SHA,
                    STARTED,
                    FINISHED,
                    token_file=self.token_file,
                    runtime_file=self.runtime_file,
                    lock_file=self.lock_file,
                    api_base_url="https://fake.invalid/api/0/",
                    hold_lock_seconds=0.03,
                )

            with ThreadPoolExecutor(max_workers=2) as executor:
                results = list(executor.map(lambda _index: invoke(), range(2)))
        finally:
            MODULE.SentryApi = original_api

        self.assertEqual(ConcurrentApi.deploy_creates, 1)
        self.assertEqual(ConcurrentApi.max_active_requests, 1)
        self.assertEqual(sorted(result[1] for result in results), ["created", "existing"])

    def test_concurrency_oracle_detects_a_missing_lock(self) -> None:
        original_api = MODULE.SentryApi
        original_lock = MODULE.exclusive_lock
        ConcurrentApi.deploy_exists = False
        ConcurrentApi.deploy_creates = 0
        ConcurrentApi.active_requests = 0
        ConcurrentApi.max_active_requests = 0

        @contextlib.contextmanager
        def no_lock(_path):
            yield

        MODULE.SentryApi = ConcurrentApi
        MODULE.exclusive_lock = no_lock
        try:
            def invoke():
                return MODULE.report_release(
                    SHA,
                    STARTED,
                    FINISHED,
                    token_file=self.token_file,
                    runtime_file=self.runtime_file,
                    lock_file=self.lock_file,
                    api_base_url="https://fake.invalid/api/0/",
                )

            with ThreadPoolExecutor(max_workers=2) as executor:
                list(executor.map(lambda _index: invoke(), range(2)))
        finally:
            MODULE.exclusive_lock = original_lock
            MODULE.SentryApi = original_api

        self.assertGreater(ConcurrentApi.max_active_requests, 1)

    def test_timestamp_order_uses_time_not_fraction_string_length(self) -> None:
        original_api = MODULE.SentryApi

        class UnexpectedApi:
            def __init__(self, _token: str, _base_url: str) -> None:
                raise AssertionError("API must not be called for reversed timestamps")

        MODULE.SentryApi = UnexpectedApi
        try:
            with self.assertRaises(MODULE.ReleaseTrackingError):
                MODULE.report_release(
                    SHA,
                    "2026-08-13T07:00:00.100000Z",
                    "2026-08-13T07:00:00.09Z",
                    token_file=self.token_file,
                    runtime_file=self.runtime_file,
                    lock_file=self.lock_file,
                    api_base_url="https://fake.invalid/api/0/",
                )
        finally:
            MODULE.SentryApi = original_api


if __name__ == "__main__":
    unittest.main()
