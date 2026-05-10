# Python Backend for IRA (FastAPI)

This backend replaces the previous Node/Express controllers with a small FastAPI demo server.

Quick start (from repo root):

```bash
# create a venv (recommended)
python -m venv .venv
source .venv/bin/activate

# install dependencies
pip install -r backend/requirements.txt

# run server (development)
uvicorn backend.main:app --host 0.0.0.0 --port 3000 --reload
```

Endpoints implemented (minimal demo behavior):
- `GET /api/stats`
- `GET /api/colleges`
- `GET /api/loans` (optional `?userId=`)
- `GET /api/loans/{id}`
- `POST /api/loans`
- `GET /api/investments` (optional `?userId=`)
- `POST /api/investments`
- `GET /api/repayments`
- `GET /api/users/{id}`
- `GET /api/users/{id}/profile`
- `POST /api/auth?action=send-otp|verify-otp|password-login`

Notes:
- Demo accounts are seeded from `backend/demo_data.py`.
- This is intentionally lightweight to support the frontend demo flow.
