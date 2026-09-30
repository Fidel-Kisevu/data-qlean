from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import json

from services.loader import (
    load_working_copy,
    save_working_copy,
    get_working_path,
    project_root,
    snapshot_before_change,
    touch_project_meta,
)
from services.detector import detect_issues
from services.suggester import issues_to_suggestions
from services.applier import apply_suggestion

router = APIRouter()


def _suggestions_path(session_id: str) -> Path:
    return project_root() / "data" / "working" / session_id / "suggestions.json"


def _load_suggestions(session_id: str) -> list:
    path = _suggestions_path(session_id)
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _save_suggestions(session_id: str, suggestions: list) -> None:
    path = _suggestions_path(session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(suggestions, indent=2), encoding="utf-8")


class SuggestionAction(BaseModel):
    action: str  # approve | reject


@router.get("/{session_id}")
def list_suggestions(session_id: str):
    try:
        df = load_working_copy(get_working_path(session_id))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    # Fresh detection from the current state of the data
    issues = detect_issues(df)
    fresh = issues_to_suggestions(issues)

    # Load previously saved suggestions and remember their statuses.
    # Suggestion IDs are stable (hash of rule + column), so the same
    # issue keeps the same ID across refreshes.
    previous = _load_suggestions(session_id)
    previous_status = {s["id"]: s.get("status", "pending") for s in previous}

    # Carry over statuses. Anything previously approved or rejected
    # stays that way — even if the issue still fires.
    for s in fresh:
        if s["id"] in previous_status:
            s["status"] = previous_status[s["id"]]

    _save_suggestions(session_id, fresh)
    return {
        "session_id": session_id,
        "status": "ok",
        "count": len(fresh),
        "suggestions": fresh,
    }


@router.post("/{session_id}/{suggestion_id}")
def act_on_suggestion(session_id: str, suggestion_id: str, body: SuggestionAction):
    if body.action not in {"approve", "reject"}:
        raise HTTPException(status_code=400, detail="action must be approve or reject")

    try:
        df = load_working_copy(get_working_path(session_id))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    suggestions = _load_suggestions(session_id)
    target = next((s for s in suggestions if s["id"] == suggestion_id), None)

    if not target:
        # Regenerate once in case the file is stale
        suggestions = issues_to_suggestions(detect_issues(df))
        _save_suggestions(session_id, suggestions)
        target = next((s for s in suggestions if s["id"] == suggestion_id), None)

    if not target:
        raise HTTPException(
            status_code=404,
            detail="Suggestion not found. Refresh suggestions list.",
        )

    if body.action == "reject":
        target["status"] = "rejected"
        _save_suggestions(session_id, suggestions)
        touch_project_meta(session_id)
        return {
            "session_id": session_id,
            "suggestion_id": suggestion_id,
            "action": "reject",
            "status": "ok",
        }

    working_path = get_working_path(session_id)
    snapshot_before_change(working_path)

    df = apply_suggestion(df, target)
    save_working_copy(df, working_path)
    touch_project_meta(session_id)
    target["status"] = "approved"
    _save_suggestions(session_id, suggestions)
    return {
        "session_id": session_id,
        "suggestion_id": suggestion_id,
        "action": "approve",
        "status": "ok",
        "rows": int(len(df)),
        "columns": list(df.columns.astype(str)),
    }