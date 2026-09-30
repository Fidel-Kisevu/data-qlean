# Data Qlean

**Local data cleaning workbench for messy CSV / Excel files.**

Load data → see profile & quality issues → review suggestions → approve changes → transform columns → export clean data.

**Nothing is changed until you approve it.** The original file is never overwritten.

---

## Project log

See [docs/PROJECT_LOG.md](docs/PROJECT_LOG.md) for the full product spec (journeys, screens, rules, API).

---

## Features (v1)

- Upload CSV or Excel (`.csv`, `.xlsx`, `.xls`)
- Profile: rows, columns, nulls, types, samples
- Quality findings (missing values, empty columns, duplicates, numeric-as-text, whitespace)
- Reconcile: suggestions with **Approve / Reject**
- Transform: rename or drop columns
- Data view table
- Export cleaned CSV or Excel

---

## Quick start

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### Sample file

Use `data/samples/messy_demo.csv` to try quality findings and suggestions.

---

## Flow

1. **Upload** a file  
2. **Dashboard** shows row/column/issue counts  
3. **Data View** shows the table  
4. **Quality Findings** lists rule-based issues  
5. **Reconcile** — approve or reject suggestions  
6. **Transform** — rename / drop columns manually  
7. **Export** cleaned CSV or Excel  

---

## Tech

Python 3.12 · FastAPI · pandas · openpyxl · React · Vite · Tailwind

---

## License

MIT
