from datetime import datetime

DEMO_ACCOUNTS = [
    {"id": "A", "name": "Aarav Sharma", "email": "aarav.sharma@mit.pune.ac.in", "hint": "MIT Pune • CSE • 3rd Year", "password": "ira@demo123", "location": "Pune, Sector 12"},
    {"id": "B", "name": "Vihaan Mehta", "email": "vihaan.mehta@mit.pune.ac.in", "hint": "MIT Pune • CSE • 4th Year", "password": "ira@demo123", "location": "Pune, Sector 12"},
    {"id": "C", "name": "Diya Patil", "email": "diya.patil@mit.pune.ac.in", "hint": "MIT Pune • Mechanical • 3rd Year", "password": "ira@demo123", "location": "Pune, Sector 12"},
    {"id": "D", "name": "Riya Menon", "email": "riya.menon@symbiosis.pune.ac.in", "hint": "Symbiosis Pune • BBA • 2nd Year", "password": "ira@demo123", "location": "Pune, Sector 8"},
]

# Build user/profile objects used by the Python backend
USERS = {}
PROFILES = {}

for i, acc in enumerate(DEMO_ACCOUNTS, start=1):
    uid = f"demo_{i}"
    USERS[acc["email"].lower()] = {
        "id": uid,
        "email": acc["email"].lower(),
        "name": acc["name"],
        "role": "student",
        "createdAt": datetime.utcnow().isoformat(),
    }
    PROFILES[uid] = {
        "name": acc["name"],
        "email": acc["email"].lower(),
        "trustScore": 10 + i,
        "avatar": None,
        "bio": acc["hint"],
        "createdAt": datetime.utcnow().isoformat(),
        "account_status": "active" if acc["id"] != "C" else "onboarding",
    }

# Sample colleges
COLLEGES = [
    {"id": "mit-pune", "name": "MIT Pune", "domain": "mit.pune.ac.in", "active": True},
    {"id": "symbiosis", "name": "Symbiosis Pune", "domain": "symbiosis.pune.ac.in", "active": True},
]

# In-memory loans, investments and repayments
LOANS = [
    {"id": "loan_1", "borrowerId": "demo_1", "amount": 5000, "tenure": 30, "interestRate": 5.0, "purpose": "Books", "status": "active", "createdAt": datetime.utcnow().isoformat(), "dueDate": datetime.utcnow().isoformat()},
]
INVESTMENTS = []
REPAYMENTS = []

# Simple stats
STATS = {
    "totalLent": 123456,
    "totalLoans": 342,
    "totalUsers": 1024,
    "totalEarned": 9876,
}

# OTP store: contact -> { otp, expires_at }
OTP_STORE = {}
