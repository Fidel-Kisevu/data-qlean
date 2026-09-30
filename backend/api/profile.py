from fastapi import APIRouter, HTTPException

from services.loader import load_working_copy, get_working_path
from services.profiler import profile_dataframe

router = APIRouter()


@router.get("/{session_id}")
def get_profile(session_id: str):
    try:
        df = load_working_copy(get_working_path(session_id))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found. Upload a file first.")

    profile = profile_dataframe(df)
    return {"session_id": session_id, "status": "ok", **profile}
