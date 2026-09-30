from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import tempfile

from services.loader import load_working_copy, get_working_path

router = APIRouter()


@router.get("/{session_id}")
def export_data(session_id: str, format: str = "csv"):
    if format not in {"csv", "xlsx"}:
        raise HTTPException(status_code=400, detail="format must be csv or xlsx")

    working_path = get_working_path(session_id)
    try:
        df = load_working_copy(working_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    if format == "csv":
        return FileResponse(
            path=str(working_path),
            filename=f"cleaned_{session_id[:8]}.csv",
            media_type="text/csv",
        )

    tmp = Path(tempfile.gettempdir()) / f"cleaned_{session_id[:8]}.xlsx"
    df.to_excel(tmp, index=False)
    return FileResponse(
        path=str(tmp),
        filename=tmp.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
