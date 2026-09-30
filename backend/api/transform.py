from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.loader import (
    load_working_copy,
    save_working_copy,
    get_working_path,
    snapshot_before_change,
    touch_project_meta,
)
from services.applier import rename_column, drop_column

router = APIRouter()


class TransformRequest(BaseModel):
    action: str  # rename_column | drop_column
    column: str
    new_name: Optional[str] = None


@router.post("/{session_id}")
def transform(session_id: str, body: TransformRequest):
    working_path = get_working_path(session_id)

    try:
        df = load_working_copy(working_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        if body.action == "rename_column":
            if not body.new_name:
                raise HTTPException(status_code=400, detail="new_name required for rename")
            df = rename_column(df, body.column, body.new_name)
        elif body.action == "drop_column":
            df = drop_column(df, body.column)
        else:
            raise HTTPException(status_code=400, detail="action must be rename_column or drop_column")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    snapshot_before_change(working_path)   # ← add
    save_working_copy(df, working_path)
    touch_project_meta(session_id)          # ← add

    return {
        "session_id": session_id,
        "status": "ok",
        "action": body.action,
        "rows": int(len(df)),
        "columns": list(df.columns.astype(str)),
    }