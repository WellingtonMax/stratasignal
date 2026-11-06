import importlib.util
import multiprocessing
import os
import struct
import time
import unittest

from stratasignal.demo import demo_bundle
from stratasignal.jobs import AnalysisJob, BusyError
from stratasignal.workbench import Workspace


def slow_worker(connection, task):
    time.sleep(10)


def invalid_worker(connection, task):
    connection.send_bytes(b"not-json")
    connection.close()


def partial_worker(connection, task):
    os.write(connection.fileno(), struct.pack("!i", 100))
    time.sleep(10)


def wait_job(runner, job_id, timeout=12):
    deadline = time.monotonic()+timeout
    while time.monotonic()<deadline:
        result=runner.snapshot(job_id)
        if result["state"]!="running":
            return result
        time.sleep(.01)
    raise AssertionError("job did not finish")


class JobTests(unittest.TestCase):
    def test_actual_spawned_analysis_returns_results_with_execution_limits(self):
        workspace=Workspace()
        try:
            workspace.load_demo({"with_previous": True})
            job=workspace.submit({"use_ml": False,"compare_previous": True})["job"]
            final=wait_job(workspace.jobs,job["id"])
            self.assertEqual(final["state"],"succeeded", final)
            report=workspace.job_result(job["id"])["report"]
            self.assertEqual(len(report["materials"]),3)
            self.assertEqual(report["execution"]["mode"],"isolated_process")
            self.assertIn("comparison",report)
            self.assertIn("intelligence",report)
            if os.name=="posix":
                self.assertEqual(report["execution"]["memory_bytes"],2*1024**3)
        finally:
            workspace.jobs.close()

    @unittest.skipUnless(importlib.util.find_spec("sklearn"),"ML optional dependency not installed")
    def test_optional_ml_runs_inside_resource_limited_child(self):
        workspace=Workspace()
        try:
            workspace.load_demo({"with_previous": False})
            job=workspace.submit({"use_ml": True,"compare_previous": False})["job"]
            self.assertEqual(wait_job(workspace.jobs,job["id"])["state"],"succeeded")
            self.assertEqual(workspace.report["delay_model"]["status"],"synthetic_demo")
        finally:
            workspace.jobs.close()

    def test_single_slot_rejects_duplicate_work_and_cancellation_reaps_child(self):
        runner=AnalysisJob(worker=slow_worker,wall_seconds=2)
        try:
            job=runner.start({},lambda report: True)
            with self.assertRaises(BusyError):
                runner.start({},lambda report: True)
            runner.cancel()
            self.assertEqual(wait_job(runner,job["id"])["state"],"cancelled")
        finally:
            runner.close()
        self.assertIsNone(runner._process)

    def test_wall_deadline_stops_a_sleeping_child(self):
        runner=AnalysisJob(worker=slow_worker,wall_seconds=.2)
        try:
            job=runner.start({},lambda report: True)
            result=wait_job(runner,job["id"])
            self.assertEqual(result["state"],"timed_out")
        finally:
            runner.close()

    @unittest.skipUnless(os.name=="posix","raw pipe frame test requires POSIX descriptors")
    def test_wall_deadline_also_interrupts_incomplete_result_frame(self):
        runner=AnalysisJob(worker=partial_worker,wall_seconds=.5)
        try:
            job=runner.start({},lambda report: True)
            self.assertEqual(wait_job(runner,job["id"])["state"],"timed_out")
        finally:
            runner.close()

    def test_malformed_worker_results_fail_without_leaking_payloads(self):
        runner=AnalysisJob(worker=invalid_worker)
        try:
            job=runner.start({"private":"SENSITIVE-TEST-MARKER"},lambda report: self.fail("must not commit malformed result"))
            result=wait_job(runner,job["id"])
            self.assertEqual(result["state"],"failed")
            self.assertNotIn("SENSITIVE-TEST-MARKER",str(result))
        finally:
            runner.close()

    def test_reset_prevents_background_result_from_restoring_cleared_inputs(self):
        workspace=Workspace()
        try:
            workspace.load_demo({"with_previous": True})
            job=workspace.submit({"use_ml": False,"compare_previous": True})["job"]
            workspace.clear()
            self.assertEqual(wait_job(workspace.jobs,job["id"])["state"],"cancelled")
            self.assertIsNone(workspace.current)
            self.assertIsNone(workspace.report)
            self.assertNotIn("report",workspace.job_result(job["id"]))
        finally:
            workspace.jobs.close()


if __name__=="__main__":
    unittest.main()
