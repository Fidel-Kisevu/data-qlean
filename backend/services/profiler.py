"""Profiler – column stats."""
from typing import Any
import pandas as pd


def profile_dataframe(df: pd.DataFrame) -> dict[str, Any]:
    profile: dict[str, Any] = {
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns": {},
    }
    total = len(df) if len(df) else 1
    for col in df.columns:
        series = df[col]
        null_count = int(series.isna().sum())
        profile["columns"][str(col)] = {
            "dtype": str(series.dtype),
            "null_count": null_count,
            "null_pct": round(null_count / total * 100, 2),
            "unique_count": int(series.nunique(dropna=True)),
            "sample_values": [str(v) for v in series.dropna().head(5).tolist()],
        }
    return profile
