from fastapi import APIRouter, HTTPException

from services.loader import load_working_copy, get_working_path
from services.flagger import flag_cells

router = APIRouter()


@router.get("/{session_id}")
def get_flags(session_id: str):
    try:
        df = load_working_copy(get_working_path(session_id))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    flags = flag_cells(df)
    return {
        "session_id": session_id,
        "count": len(flags),
        "flags": flags,
    }