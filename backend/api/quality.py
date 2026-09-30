from fastapi import APIRouter, HTTPException

from services.loader import load_working_copy, get_working_path
from services.detector import detect_issues

router = APIRouter()


@router.get("/{session_id}")
def get_quality(session_id: str):
    try:
        df = load_working_copy(get_working_path(session_id))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    issues = detect_issues(df)
    by_severity = {}
    for i in issues:
        sev = i.get("severity", "low")
        by_severity[sev] = by_severity.get(sev, 0) + 1

    return {
        "session_id": session_id,
        "status": "ok",
        "count": len(issues),
        "by_severity": by_severity,
        "issues": issues,
    }
