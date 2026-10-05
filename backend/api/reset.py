from fastapi import APIRouter, HTTPException

from services.loader import (
    load_file,
    save_working_copy,
    get_working_path,
    get_upload_dir,
    snapshot_before_change,
    touch_project_meta,
)

router = APIRouter()


@router.post("/{session_id}")
def reset_to_original(session_id: str):
    upload_dir = get_upload_dir(session_id)
    if not upload_dir.exists():
        raise HTTPException(status_code=404, detail="Upload folder not found")

    files = [p for p in upload_dir.iterdir() if p.is_file()]
    if not files:
        raise HTTPException(status_code=404, detail="No uploaded file found")

    original = files[0]
    working_path = get_working_path(session_id)

    if working_path.exists():
        snapshot_before_change(working_path)

    df = load_file(original)
    save_working_copy(df, working_path)
    touch_project_meta(session_id)

    return {
        "session_id": session_id,
        "status": "ok",
        "message": "Working copy reset to original file",
    }