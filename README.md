# Ira 💸

*A Peer-to-Peer Lending Platform for Students*

## 📌 Overview

**Ira** is a full-stack peer-to-peer (P2P) lending platform designed specifically for college students. It enables users to:

* Borrow small amounts for emergencies or personal needs
* Lend money to peers and earn attractive returns (12–18%)
* Build trust through verification and repayment tracking

The platform focuses on simplicity, accessibility, and financial empowerment within student communities.

---

## 🚀 Features

### 🔐 Authentication & Security

* User registration & login
* Password hashing using `bcryptjs`
* Authentication middleware for protected routes

### 💰 Lending & Borrowing

* Create loan requests
* Fund loans as a lender
* Track active and completed loans

### 📊 Repayments

* Structured repayment system
* Track repayment history
* Monitor outstanding balances

### 👤 User Management

* User profiles
* Borrower/lender activity tracking

### ✅ Verification System

* User verification endpoints
* Trust-building mechanisms for safer transactions

### 🧾 Interest Handling

* Predefined interest slabs
* Transparent return calculation

---

## 🏗️ Tech Stack

### Backend

* **Node.js** with **Express.js**
* **SQLite** (via `better-sqlite3`)
* RESTful API architecture

### Security

* `bcryptjs` for password hashing
* CORS-enabled API

---

## 📂 Project Structure

```
Ira/
│
├── backend/
│   ├── index.js              # Main server entry point
│   ├── routes/               # API route handlers
│   ├── middleware/           # Authentication middleware
│   └── database/ (implicit)  # SQLite database usage
│
├── package.json              # Project dependencies
└── README.md                 # Project documentation
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/ira.git
cd ira
```

### 2️⃣ Install Dependencies

```bash
npm install
cd backend
npm install
```

### 3️⃣ Run the Server

```bash
node index.js
```

Server will start on:

```
http://localhost:5001
```

---

## 🔗 API Endpoints

### Auth

```
POST /api/auth/register
POST /api/auth/login
```

### Loans

```
GET    /api/loans
POST   /api/loans
```

### Repayments

```
GET    /api/repayments
POST   /api/repayments
```

### Users

```
GET /api/users
```

### Verification

```
POST /api/verification
```

### Health Check

```
GET /api/health
```

---

## 🧪 Testing

Currently, no automated tests are configured.

Run:

```bash
npm test
```

---

## 🌱 Future Enhancements

* Frontend UI (React or Vanilla JS)
* Payment gateway integration
* Credit scoring system
* Notifications (email/SMS)
* Admin dashboard
* AI-based risk assessment

---

## 🤝 Contribution

Contributions are welcome!
Feel free to fork the repository and submit pull requests.

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👨‍💻 Author

**Rishi Chowdary**

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub!
