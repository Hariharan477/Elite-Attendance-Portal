# Elite Attendance Portal

A secure, multi-factor college attendance management system built for educational institutions.

## Architecture & Technology Stack

The application consists of three core components:

1. **Node.js/Express Backend API** (`server/`)
   - Node.js + Express framework
   - MongoDB database with Mongoose ORM
   - JWT authentication & authorization middleware
   - Server-authoritative timing and Wi-Fi verification

2. **React/TypeScript Admin Web Dashboard** (`client/`)
   - Vite + React + TypeScript
   - Attendance session creation (Date, Start/End Time, Wi-Fi AP selection)
   - Real-time student attendance reporting
   - Student device registration status & remote device reset

3. **Flutter Android Student Mobile App** (`mobile_app/`)
   - Cross-platform Flutter Framework (Dart)
   - Google Sign-In integration
   - Keystore-backed hardware device binding (`FlutterSecureStorage`)
   - Real-time Wi-Fi SSID/BSSID scanning

---

## 🔒 Security Architecture

Attendance marking enforces a **5-Factor Security Formula**:

$$\text{Attendance PRESENT} = \text{Admin Registered Student} \land \text{Valid JWT} \land \text{Bound Student Device} \land \text{Authorized Wi-Fi BSSID} \land (t_{\text{start}} \le t_{\text{current}} < t_{\text{end}})$$

Key Security Guarantees:
- **Admin-Approved Logins**: Only students whose emails are registered in MongoDB by an administrator can log in.
- **Hardware Device Binding**: A persistent installation identifier stored in Android Keystore binds a student to their own mobile phone. Account sharing across phones is strictly blocked (`403 Forbidden`).
- **Campus Wi-Fi BSSID Verification**: Verifies physical presence by comparing current BSSID with the authorized access point.
- **Server-Authoritative Time Windows**: Attendance requests outside `startTime` and `endTime` are rejected on the server.
- **Admin Remote Reset**: Administrators can reset device associations when a student replaces their phone.

---

## 📁 Repository Structure

```
Elite-Attendance-Portal/
├── server/             # Node.js Express REST API backend
├── client/             # React/Vite Admin Web Application
├── mobile_app/         # Flutter Android Student Application
├── .gitignore          # Environment & build file exclusion rules
└── README.md           # Project documentation
```

---

## 🚀 Getting Started

### 1. Server Setup (`server/`)
```bash
cd server
npm install
cp .env.example .env   # Configure your MongoDB URI and JWT_SECRET
npm run build
npm run dev
```

### 2. Admin Web App Setup (`client/`)
```bash
cd client
npm install
cp .env.example .env   # Configure VITE_API_BASE_URL
npm run dev
```

### 3. Mobile App Setup (`mobile_app/`)
```bash
cd mobile_app
flutter pub get
flutter run
```
