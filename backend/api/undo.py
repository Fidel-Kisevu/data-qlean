from fastapi import APIRouter, HTTPException

from services.loader import (
    get_working_path,
    list_snapshots,
    restore_snapshot,
)

router = APIRouter()


@router.get("/{session_id}/can-undo")
def can_undo(session_id: str):
    snaps = list_snapshots(get_working_path(session_id))
    return {
        "session_id": session_id,
        "can_undo": len(snaps) > 0,
        "depth": len(snaps),
    }


@router.post("/{session_id}")
def undo_last(session_id: str):
    working_path = get_working_path(session_id)
    snaps = list_snapshots(working_path)

    if not snaps:
        raise HTTPException(status_code=404, detail="Nothing to undo")

    latest = snaps[-1]
    restore_snapshot(latest, working_path)
    latest.unlink()

    return {
        "session_id": session_id,
        "restored_from": latest.name,
        "remaining_undo": len(snaps) - 1,
    }