"""Run this copied file outside the checkout with the wheel's interpreter."""
import sys
import time
from pathlib import Path


def main():
    import stratasignal
    from stratasignal.workbench import UI, create_server
    assert Path(stratasignal.__file__).resolve().is_relative_to(Path(sys.prefix).resolve())
    assert all((UI/name).is_file() for name in ("index.html", "app.js", "insights.js", "geo-map.js", "geo-globe.js", "world-land.svg"))
    server, _, workspace=create_server(0)
    try:
        workspace.load_demo({"with_previous": True})
        job=workspace.submit({"use_ml": False,"compare_previous": True})["job"]
        deadline=time.monotonic()+15
        while time.monotonic()<deadline:
            result=workspace.job_result(job["id"])
            if result["job"]["state"]!="running":break
            time.sleep(.02)
        assert result["job"]["state"]=="succeeded",result["job"]
        assert result["report"]["execution"]["mode"]=="isolated_process"
        assert len(result["report"]["intelligence"]["supplier_performance"])==6
        assert len(result["report"]["comparison"]["materials"])==3
        assert "StrataInsights" in workspace.export("html")[0]
        print("Installed assets and isolated analysis verified outside the checkout.")
    finally:
        server.server_close()


if __name__=="__main__":
    main()
