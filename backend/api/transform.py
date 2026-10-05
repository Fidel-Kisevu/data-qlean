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
from services.applier import (
    rename_column,
    drop_column,
    reorder_columns,
    sort_rows,
    delete_rows,
    apply_suggestion,
)

router = APIRouter()


class TransformRequest(BaseModel):
    action: str
    column: Optional[str] = None
    new_name: Optional[str] = None
    order: Optional[list[str]] = None
    ascending: Optional[bool] = True
    indices: Optional[list[int]] = None


class ApplyActionRequest(BaseModel):
    column: Optional[str] = None
    action: str
    params: Optional[dict] = None


@router.post("/{session_id}/apply-action")
def apply_action(session_id: str, body: ApplyActionRequest):
    """Apply any applier action directly to a column, without a suggestion.

    Used by the column action menu for manual operations like uppercase,
    trim, fill with median, etc.
    """
    working_path = get_working_path(session_id)

    try:
        df = load_working_copy(working_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    fake_suggestion = {
        "proposed_action": body.action,
        "column": body.column,
        "params": body.params or {},
    }

    try:
        result_df = apply_suggestion(df, fake_suggestion)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    snapshot_before_change(working_path)
    save_working_copy(result_df, working_path)
    touch_project_meta(session_id)

    return {
        "session_id": session_id,
        "status": "ok",
        "action": body.action,
        "column": body.column,
        "rows": int(len(result_df)),
        "columns": list(result_df.columns.astype(str)),
    }


@router.post("/{session_id}")
def transform(session_id: str, body: TransformRequest):
    working_path = get_working_path(session_id)

    try:
        df = load_working_copy(working_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        if body.action == "rename_column":
            if not body.new_name or not body.column:
                raise HTTPException(status_code=400, detail="new_name and column required")
            df = rename_column(df, body.column, body.new_name)

        elif body.action == "drop_column":
            if not body.column:
                raise HTTPException(status_code=400, detail="column required")
            df = drop_column(df, body.column)

        elif body.action == "reorder_columns":
            if not body.order:
                raise HTTPException(status_code=400, detail="order required")
            df = reorder_columns(df, body.order)

        elif body.action == "sort":
            if not body.column:
                raise HTTPException(status_code=400, detail="column required")
            df = sort_rows(df, body.column, body.ascending if body.ascending is not None else True)

        elif body.action == "delete_rows":
            if body.indices is None:
                raise HTTPException(status_code=400, detail="indices required")
            df = delete_rows(df, body.indices)

        else:
            raise HTTPException(
                status_code=400,
                detail="Unknown action. Must be rename_column, drop_column, reorder_columns, sort, or delete_rows",
            )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    snapshot_before_change(working_path)
    save_working_copy(df, working_path)
    touch_project_meta(session_id)

    return {
        "session_id": session_id,
        "status": "ok",
        "action": body.action,
        "rows": int(len(df)),
        "columns": list(df.columns.astype(str)),
    }