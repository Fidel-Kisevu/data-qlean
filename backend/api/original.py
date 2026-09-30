from fastapi import APIRouter, HTTPException, Query
import numpy as np
import pandas as pd

from services.loader import get_upload_dir

router = APIRouter()


@router.get("/{session_id}")
def get_original(
    session_id: str,
    limit: int = Query(5000, ge=1, le=100000),
    offset: int = Query(0, ge=0),
):
    upload_dir = get_upload_dir(session_id)
    if not upload_dir.exists():
        raise HTTPException(status_code=404, detail="Upload folder not found")

    files = [p for p in upload_dir.iterdir() if p.is_file()]
    if not files:
        raise HTTPException(status_code=404, detail="No uploaded file found")

    file_path = files[0]
    suffix = file_path.suffix.lower()

    try:
        if suffix == ".csv":
            raw = None
            for sep in [",", ";", "\t", "|"]:
                try:
                    trial = pd.read_csv(file_path, sep=sep, dtype=str)
                    if len(trial.columns) > 1:
                        raw = trial
                        break
                except Exception:
                    continue
            if raw is None:
                raw = pd.read_csv(file_path, sep=None, engine="python", dtype=str)

        elif suffix in {".xlsx", ".xls"}:
            raw = pd.read_excel(file_path, header=None, dtype=str)

            n_cols = raw.shape[1]
            threshold = max(2, n_cols // 2)
            header_row = 0
            for i in range(min(30, len(raw))):
                filled = raw.iloc[i].notna().sum()
                if filled >= threshold:
                    header_row = i
                    break

            raw.columns = [
                str(v) if pd.notna(v) and str(v).strip() else f"column_{j + 1}"
                for j, v in enumerate(raw.iloc[header_row])
            ]
            raw = raw.iloc[header_row + 1 :].reset_index(drop=True)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read original: {e}")

    total_rows = len(raw)
    slice_df = raw.iloc[offset : offset + limit]

    safe = slice_df.astype(object).where(slice_df.notna(), None)
    records = safe.to_dict(orient="records")

    for row in records:
        for k, v in row.items():
            if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                row[k] = None

    return {
        "session_id": session_id,
        "filename": file_path.name,
        "file_size_bytes": file_path.stat().st_size,
        "total_rows": total_rows,
        "offset": offset,
        "limit": limit,
        "columns": [str(c) for c in raw.columns],
        "rows": records,
    }