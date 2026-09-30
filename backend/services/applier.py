"""Applier – apply approved suggestion or manual transform."""
from typing import Any
import pandas as pd


def apply_suggestion(df: pd.DataFrame, suggestion: dict[str, Any]) -> pd.DataFrame:
    action = suggestion.get("proposed_action")
    column = suggestion.get("column")
    df = df.copy()

    if action == "drop_column" and column in df.columns:
        return df.drop(columns=[column])

    if action == "drop_empty_rows":
        return df.dropna(how="all").reset_index(drop=True)

    if action == "fill_null_with_placeholder" and column in df.columns:
        return df.fillna({column: "(missing)"})

    if action == "drop_duplicates":
        return df.drop_duplicates()

    if action == "to_numeric" and column in df.columns:
        df[column] = pd.to_numeric(df[column], errors="coerce")
        return df

    if action == "trim" and column in df.columns:
        df[column] = df[column].astype(str).str.strip()
        df[column] = df[column].replace({"nan": None, "None": None})
        return df

    return df


def rename_column(df: pd.DataFrame, old: str, new: str) -> pd.DataFrame:
    if old not in df.columns:
        raise ValueError(f"Column not found: {old}")
    if new in df.columns and new != old:
        raise ValueError(f"Column already exists: {new}")
    return df.rename(columns={old: new})


def drop_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    if column not in df.columns:
        raise ValueError(f"Column not found: {column}")
    return df.drop(columns=[column])