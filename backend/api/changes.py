from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from pathlib import Path
import json

from services.loader import project_root

router = APIRouter()

CHANGES_DIR = project_root() / "data" / "changes"
CHANGES_DIR.mkdir(parents=True, exist_ok=True)


class ChangeIn(BaseModel):
    action: str
    rule_id: str | None = None
    column: str | None = None
    description: str
    before: dict | None = None
    after: dict | None = None


def _changes_file(session_id: str) -> Path:
    if not session_id.replace("-", "").isalnum():
        raise HTTPException(status_code=400, detail="Invalid session id")
    return CHANGES_DIR / f"{session_id}.json"


def _read_changes(session_id: str) -> list[dict]:
    path = _changes_file(session_id)
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return []


def _write_changes(session_id: str, changes: list[dict]) -> None:
    _changes_file(session_id).write_text(json.dumps(changes, indent=2))


# --- Route order matters: the more specific /last route must come BEFORE
# --- the /{session_id} DELETE so FastAPI matches it correctly.

@router.get("/{session_id}")
def get_changes(session_id: str):
    return {"changes": _read_changes(session_id)}


@router.post("/{session_id}")
def add_change(session_id: str, change: ChangeIn):
    changes = _read_changes(session_id)
    entry = {
        "id": f"chg_{len(changes) + 1:04d}",
        "applied_at": datetime.now(timezone.utc).isoformat(),
        **change.model_dump(exclude_none=True),
    }
    changes.append(entry)
    _write_changes(session_id, changes)
    return entry


@router.delete("/{session_id}/last")
def pop_last_change(session_id: str):
    changes = _read_changes(session_id)
    if not changes:
        raise HTTPException(status_code=404, detail="Nothing to pop")
    removed = changes.pop()
    _write_changes(session_id, changes)
    return {"removed": removed, "remaining": len(changes)}


@router.delete("/{session_id}")
def clear_changes(session_id: str):
    _changes_file(session_id).unlink(missing_ok=True)
    return {"ok": True}