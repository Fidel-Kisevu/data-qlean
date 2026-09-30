from fastapi import APIRouter, HTTPException, Query
import numpy as np

from services.loader import load_working_copy, get_working_path

router = APIRouter()


@router.get("/{session_id}")
def get_data(
    session_id: str,
    limit: int = Query(10000, ge=1, le=100000),
    offset: int = Query(0, ge=0),
):
    try:
        df = load_working_copy(get_working_path(session_id))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    slice_df = df.iloc[offset : offset + limit]

    # Convert NaN / Inf to None so json.dumps() accepts them.
    # `.astype(object)` first breaks the float dtype, otherwise pandas
    # silently converts None back to NaN to preserve the column type.
    safe = slice_df.astype(object).where(slice_df.notna(), None)
    records = safe.to_dict(orient="records")

    # Belt and suspenders: any remaining NaN/Inf in numeric cells → None
    for row in records:
        for k, v in row.items():
            if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                row[k] = None

    return {
        "session_id": session_id,
        "total_rows": int(len(df)),
        "offset": offset,
        "limit": limit,
        "columns": list(df.columns.astype(str)),
        "rows": records,
    }