"""Real Linux process/session tests with a file-backed service fixture, no SSH/VPS."""

import base64
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time
import unittest


ROOT = Path(sys.argv.pop(1)).resolve()


def wait_for(predicate, timeout=10):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.05)
    raise AssertionError("Timed out waiting for fixture side effect")


def render(source, fixture):
    # Substitute inside the encoded payload too, without changing its contract.
    text = source.replace("/__TM_JOB_FIXTURE__", str(fixture))
    match = re.search(r"printf '%s' '([A-Za-z0-9+/=]+)' \| base64 -d", text)
    if match:
        original = base64.b64decode(match[1])
        payload = original.replace(b"/__TM_JOB_FIXTURE__", str(fixture).encode())
        text = text.replace(match[1], base64.b64encode(payload).decode())
        text = text.replace(hashlib.sha256(original).hexdigest(), hashlib.sha256(payload).hexdigest())
    return text


class DurablePromotionTests(unittest.TestCase):
    def setUp(self):
        self.fixture = ROOT / self._testMethodName
        self.fixture.mkdir()
        self.start = render((ROOT / "start.sh").read_text(), self.fixture)
        self.status = render((ROOT / "status.sh").read_text(), self.fixture)
        self.observers = []

    def tearDown(self):
        (self.fixture / "stop-allowed").touch()
        (self.fixture / "finish-allowed").touch()
        for observer in self.observers:
            if observer.poll() is None:
                os.killpg(observer.pid, signal.SIGTERM)
            observer.wait(timeout=10)

    def start_observer(self):
        # A local process group stands in for the controlling SSH session.
        observer = subprocess.Popen(
            ["bash", "-c", self.start + '\nprintf ready > "' + str(self.fixture / "observer-ready") + '"\nsleep 60'],
            start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.observers.append(observer)
        wait_for(lambda: (self.fixture / "before-stop").exists())
        return observer

    def read_status(self):
        result = subprocess.run(["bash", "-c", self.status], capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

    def finish(self, expected_code=0):
        (self.fixture / "stop-allowed").touch()
        (self.fixture / "finish-allowed").touch()
        if expected_code == 0:
            wait_for(lambda: (self.fixture / "committed").exists())
        wait_for(lambda: (self.fixture / "job/exit-code").exists())
        self.assertEqual(self.read_status(), {"state": "completed", "exitCode": expected_code})
        self.assertEqual((self.fixture / "service").read_text(), "active\n")
        self.assertEqual((self.fixture / "invocations").read_text(), "invoked\n")

    def test_disconnect_before_stop(self):
        observer = self.start_observer()
        os.killpg(observer.pid, signal.SIGHUP)
        observer.wait(timeout=10)
        self.finish()

    def test_disconnect_while_primary_stopped(self):
        observer = self.start_observer()
        (self.fixture / "stop-allowed").touch()
        wait_for(lambda: (self.fixture / "after-stop").exists())
        self.assertEqual((self.fixture / "service").read_text(), "stopped\n")
        os.killpg(observer.pid, signal.SIGTERM)
        observer.wait(timeout=10)
        self.finish()
        self.assertIn("Promote ok", (self.fixture / "job/job.log").read_text())

    def test_failed_payload_recovers_and_reports_failure(self):
        self.start_observer()
        (self.fixture / "fail").touch()
        self.finish(expected_code=23)
        self.assertIn("attempting guarded recovery", (self.fixture / "job/job.log").read_text())

    def test_duplicate_start_does_not_replace_payload(self):
        self.start_observer()
        original = (self.fixture / "job/payload.sh").read_bytes()
        duplicate = subprocess.run(["bash", "-c", self.start], capture_output=True)
        self.assertNotEqual(duplicate.returncode, 0)
        self.assertEqual((self.fixture / "job/payload.sh").read_bytes(), original)
        self.finish()

    def test_unknown_job_is_not_success(self):
        self.assertEqual(self.read_status(), {"state": "unknown"})

    def test_unrelated_pid_is_not_a_running_job(self):
        job = self.fixture / "job"
        job.mkdir()
        (job / "pid").write_text(str(os.getpid()))
        self.assertEqual(self.read_status(), {"state": "unknown"})

    def test_other_job_still_obeys_shared_deploy_lock(self):
        self.start_observer()
        second = self.start.replace(str(self.fixture / "job"), str(self.fixture / "other-job"))
        subprocess.run(["bash", "-c", second], check=True, capture_output=True)
        wait_for(lambda: (self.fixture / "other-job/exit-code").exists())
        self.assertEqual((self.fixture / "other-job/exit-code").read_text(), "75\n")
        self.assertEqual(self.read_status(), {"state": "running"})
        self.finish()


if __name__ == "__main__":
    unittest.main()
