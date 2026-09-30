"""Loader – CSV/Excel → working DataFrame.

This loader does NOT modify data at read time. No rows dropped, no
columns dropped, no header trimming. Whatever pandas reads is what you
see in the workbench. All cleaning happens through approved suggestions.
"""
from pathlib import Path
import shutil
from datetime import datetime, timezone
import pandas as pd
import json


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _read_excel_smart(file_path: Path) -> pd.DataFrame:
    """Read an Excel file, auto-detecting the header row.

    Strategy: scan the first 30 rows. The header is the first row where
    at least half the columns are non-null. Handles files with leading
    blank rows, title blocks, or instruction sections.
    """
    raw = pd.read_excel(file_path, header=None, dtype=object)

    if raw.empty:
        return pd.DataFrame()

    n_cols = raw.shape[1]
    threshold = max(2, n_cols // 2)

    header_row = 0
    for i in range(min(30, len(raw))):
        filled = raw.iloc[i].notna().sum()
        if filled >= threshold:
            header_row = i
            break

    df = pd.read_excel(file_path, header=header_row)

    # Drop a leading column that has no name AND is entirely empty
    # (common when Excel files have a stray empty first column).
    if len(df.columns) > 0:
        first = df.columns[0]
        looks_unnamed = (
            isinstance(first, str) and first.startswith("Unnamed")
        ) or pd.isna(first)
        if looks_unnamed and df[df.columns[0]].isna().all():
            df = df.drop(columns=[df.columns[0]])

    return df

def _read_csv_smart(file_path: Path) -> pd.DataFrame:
    """Read a CSV with common delimiter fallbacks. No cleaning."""
    for sep in [",", ";", "\t", "|"]:
        try:
            df = pd.read_csv(file_path, sep=sep)
            if len(df.columns) > 1:
                return df
        except Exception:
            continue
    return pd.read_csv(file_path, sep=None, engine="python")


def load_file(file_path: Path) -> pd.DataFrame:
    suffix = file_path.suffix.lower()
    if suffix == ".csv":
        return _read_csv_smart(file_path)
    if suffix in {".xlsx", ".xls"}:
        return _read_excel_smart(file_path)
    raise ValueError(f"Unsupported file type: {suffix}")


def save_working_copy(df: pd.DataFrame, working_path: Path) -> None:
    working_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(working_path, index=False)


def load_working_copy(working_path: Path) -> pd.DataFrame:
    if not working_path.exists():
        raise FileNotFoundError(f"Working copy not found: {working_path}")
    return pd.read_csv(working_path)


def get_working_path(session_id: str) -> Path:
    return project_root() / "data" / "working" / session_id / "working.csv"


def get_upload_dir(session_id: str) -> Path:
    return project_root() / "data" / "uploads" / session_id


# ---------- Snapshots (undo support) ----------

def _snapshots_dir(working_path: Path) -> Path:
    return working_path.parent / "snapshots"


def snapshot_before_change(working_path: Path) -> Path:
    """Copy the current working file to a timestamped snapshot.

    Called right before a mutating action so it can be reverted.
    Returns the snapshot path.
    """
    if not working_path.exists():
        raise FileNotFoundError(f"Nothing to snapshot: {working_path}")

    snap_dir = _snapshots_dir(working_path)
    snap_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    snapshot_path = snap_dir / f"before_{stamp}.csv"
    shutil.copy2(working_path, snapshot_path)
    return snapshot_path


def list_snapshots(working_path: Path) -> list[Path]:
    """All snapshots for a working copy, oldest first."""
    snap_dir = _snapshots_dir(working_path)
    if not snap_dir.exists():
        return []
    return sorted(snap_dir.glob("before_*.csv"))


def restore_snapshot(snapshot_path: Path, working_path: Path) -> None:
    """Copy a snapshot back over the working file."""
    if not snapshot_path.exists():
        raise FileNotFoundError(f"Snapshot missing: {snapshot_path}")
    shutil.copy2(snapshot_path, working_path)


def prune_snapshots(working_path: Path, keep: int = 50) -> None:
    """Delete all but the N most recent snapshots to cap disk usage."""
    snaps = list_snapshots(working_path)
    for old in snaps[:-keep]:
        old.unlink(missing_ok=True)

# ---------- Project metadata ----------

def _meta_path(session_id: str) -> Path:
    return project_root() / "data" / "working" / session_id / "meta.json"


def write_project_meta(
    session_id: str,
    filename: str,
    rows: int,
    columns: list[str],
    bytes_size: int | None = None,
) -> None:
    """Record project metadata. Overwrites if it exists."""
    path = _meta_path(session_id)
    path.parent.mkdir(parents=True, exist_ok=True)

    existing = read_project_meta(session_id) or {}
    meta = {
        "session_id": session_id,
        "filename": filename,
        "rows": rows,
        "columns": columns,
        "bytes": bytes_size,
        "created_at": existing.get("created_at") or datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    path.write_text(json.dumps(meta, indent=2), encoding="utf-8")


def read_project_meta(session_id: str) -> dict | None:
    path = _meta_path(session_id)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def touch_project_meta(session_id: str) -> None:
    """Bump updated_at without rewriting everything."""
    meta = read_project_meta(session_id)
    if not meta:
        return
    meta["updated_at"] = datetime.now(timezone.utc).isoformat()
    _meta_path(session_id).write_text(json.dumps(meta, indent=2), encoding="utf-8")


def list_projects() -> list[dict]:
    """Return all projects, newest activity first."""
    working_root = project_root() / "data" / "working"
    if not working_root.exists():
        return []

    projects = []
    for session_dir in working_root.iterdir():
        if not session_dir.is_dir():
            continue
        meta = read_project_meta(session_dir.name)
        if not meta:
            continue
        projects.append(meta)

    projects.sort(key=lambda m: m.get("updated_at", ""), reverse=True)
    return projects


def delete_project(session_id: str) -> None:
    """Remove the working copy, its snapshots, its meta, its audit log."""
    working_dir = project_root() / "data" / "working" / session_id
    upload_dir = project_root() / "data" / "uploads" / session_id
    changes_file = project_root() / "data" / "changes" / f"{session_id}.json"

    if working_dir.exists():
        shutil.rmtree(working_dir, ignore_errors=True)
    if upload_dir.exists():
        shutil.rmtree(upload_dir, ignore_errors=True)
    if changes_file.exists():
        changes_file.unlink(missing_ok=True)