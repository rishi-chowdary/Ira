from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import random
import time
from datetime import datetime, timedelta

from . import demo_data

app = FastAPI(title="IRA Python Backend")

# CORS: allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helpers
def find_demo_user_by_email(email: str):
    if not email: return None
    return demo_data.USERS.get(email.lower())

def find_demo_profile_by_userid(uid: str):
    return demo_data.PROFILES.get(uid)

# API endpoints used by frontend
@app.get("/api/stats")
async def get_stats():
    return demo_data.STATS

@app.get("/api/colleges")
async def get_colleges():
    return demo_data.COLLEGES

@app.get("/api/loans")
async def list_loans(userId: Optional[str] = None):
    if userId:
        return [l for l in demo_data.LOANS if l.get('borrowerId') == userId]
    return demo_data.LOANS

@app.get("/api/loans/{loan_id}")
async def get_loan(loan_id: str):
    for l in demo_data.LOANS:
        if l.get('id') == loan_id:
            return l
    raise HTTPException(status_code=404, detail="Loan not found")

@app.post("/api/loans")
async def create_loan(req: Request):
    body = await req.json()
    new_id = f"loan_{len(demo_data.LOANS) + 1}"
    loan = {
        "id": new_id,
        "borrowerId": body.get('borrowerId'),
        "amount": body.get('amount'),
        "tenure": body.get('tenure'),
        "interestRate": body.get('interestRate', 6.0),
        "purpose": body.get('purpose', ''),
        "status": 'pending',
        "createdAt": datetime.utcnow().isoformat(),
        "dueDate": (datetime.utcnow() + timedelta(days=body.get('tenure', 30))).isoformat(),
    }
    demo_data.LOANS.append(loan)
    return loan

@app.get("/api/investments")
async def list_investments(userId: Optional[str] = None):
    if userId:
        return [i for i in demo_data.INVESTMENTS if i.get('lenderId') == userId]
    return demo_data.INVESTMENTS

@app.post("/api/investments")
async def create_investment(req: Request):
    body = await req.json()
    new_id = f"inv_{len(demo_data.INVESTMENTS) + 1}"
    inv = {
        "id": new_id,
        "lenderId": body.get('lenderId'),
        "loanId": body.get('loanId'),
        "amount": body.get('amount'),
        "createdAt": datetime.utcnow().isoformat(),
        "expectedReturn": body.get('expectedReturn', 0),
    }
    demo_data.INVESTMENTS.append(inv)
    return inv

@app.get("/api/repayments")
async def list_repayments():
    return demo_data.REPAYMENTS

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    # allow either demo_{n} or email
    user = None
    if user_id.startswith('demo_'):
        for u in demo_data.USERS.values():
            if u['id'] == user_id:
                user = u
                break
    else:
        user = demo_data.USERS.get(user_id.lower())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/users/{user_id}/profile")
async def get_profile(user_id: str):
    # Accept both email and user id
    uid = user_id
    if not user_id.startswith('demo_'):
        u = demo_data.USERS.get(user_id.lower())
        if u:
            uid = u['id']
    profile = demo_data.PROFILES.get(uid)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.post("/api/auth")
async def auth(request: Request, action: Optional[str] = Query(None)):
    body = await request.json()
    action = (action or '').lower()

    if action == 'send-otp':
        contact = body.get('contact')
        if not contact:
            raise HTTPException(status_code=400, detail='contact required')
        otp = str(random.randint(100000, 999999))
        demo_data.OTP_STORE[contact] = {"otp": otp, "expires_at": time.time() + 300}
        # For demo we return OTP so frontend can show it.
        return {"otp": otp}

    if action == 'verify-otp':
        contact = body.get('contact')
        otp = body.get('otp')
        isSignup = body.get('isSignup', False)
        entry = demo_data.OTP_STORE.get(contact)
        if not entry or entry.get('otp') != otp or entry.get('expires_at', 0) < time.time():
            raise HTTPException(status_code=400, detail='Invalid or expired OTP')
        # Decide if user exists
        user = demo_data.USERS.get(contact.lower())
        if user:
            profile = demo_data.PROFILES.get(user['id'])
            return {"user": user, "profile": profile, "isNew": False}
        else:
            # For demo, if contact matches a DEMO_ACCOUNTS email, create user object on the fly
            for acc in demo_data.DEMO_ACCOUNTS:
                if acc['email'].lower() == contact.lower():
                    user_obj = demo_data.USERS.get(contact.lower())
                    if not user_obj:
                        # create
                        idx = len(demo_data.USERS) + 1
                        uid = f"demo_{idx}"
                        user_obj = {"id": uid, "email": contact.lower(), "name": acc['name'], 'role': 'student', 'createdAt': datetime.utcnow().isoformat()}
                        demo_data.USERS[contact.lower()] = user_obj
                        demo_data.PROFILES[uid] = {"name": acc['name'], "email": contact.lower(), "trustScore": 5, "createdAt": datetime.utcnow().isoformat(), "account_status": "onboarding"}
                    profile = demo_data.PROFILES.get(user_obj['id'])
                    return {"user": user_obj, "profile": profile, "isNew": False}
            return {"isNew": True}

    if action == 'password-login':
        email = body.get('email')
        password = body.get('password')
        if not email or not password:
            raise HTTPException(status_code=400, detail='email and password required')
        # Check demo accounts
        for acc in demo_data.DEMO_ACCOUNTS:
            if acc['email'].lower() == email.lower() and acc['password'] == password:
                user = demo_data.USERS.get(email.lower())
                if not user:
                    idx = len(demo_data.USERS) + 1
                    uid = f"demo_{idx}"
                    user = {"id": uid, "email": email.lower(), "name": acc['name'], "role": 'student', 'createdAt': datetime.utcnow().isoformat()}
                    demo_data.USERS[email.lower()] = user
                    demo_data.PROFILES[uid] = {"name": acc['name'], "email": email.lower(), "trustScore": 5, "createdAt": datetime.utcnow().isoformat(), "account_status": "active"}
                profile = demo_data.PROFILES.get(user['id'])
                return {"user": user, "profile": profile}
        raise HTTPException(status_code=401, detail='Invalid email or password')

    raise HTTPException(status_code=400, detail='Unknown action')

if __name__ == '__main__':
    uvicorn.run('backend.main:app', host='0.0.0.0', port=3000, reload=True)
