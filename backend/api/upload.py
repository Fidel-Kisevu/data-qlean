from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import uuid
from datetime import datetime, timezone

from services.loader import (
    load_file,
    save_working_copy,
    get_working_path,
    get_upload_dir,
    write_project_meta,
)

router = APIRouter()


@router.post("")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    session_id = str(uuid.uuid4())
    upload_dir = get_upload_dir(session_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    dest = upload_dir / file.filename
    content = await file.read()
    dest.write_bytes(content)

    try:
        df = load_file(dest)
        save_working_copy(df, get_working_path(session_id))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load file: {e}")

    # Record project metadata so it shows up in the Projects list
    write_project_meta(
        session_id=session_id,
        filename=file.filename,
        rows=int(len(df)),
        columns=list(df.columns.astype(str)),
        bytes_size=len(content),
    )

    return {
        "session_id": session_id,
        "filename": file.filename,
        "bytes": len(content),
        "rows": int(len(df)),
        "columns": list(df.columns.astype(str)),
        "status": "uploaded",
        "message": "File loaded into working copy. Original is untouched.",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }