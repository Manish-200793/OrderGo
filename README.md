# 🍔 OrderGo

OrderGo is a modern, responsive food ordering application built for campus cafeterias. It streamlines the entire process of ordering food, tracking preparation status, handling payments, and verifying order pickups using an integrated QR code scanner.

## ✨ Features

* **Role-Based Access Control:** Separate, dedicated interfaces for **Students**, **Staff**, and **Admins**.
* **Modern UI/UX:** Premium dark-themed, glassmorphism design system built from scratch with custom CSS and smooth micro-animations.
* **Live Order Tracking:** Real-time visual status updates (Pending → Preparing → Ready → Completed).
* **UPI Payment Flow:** Generates automated UPI payment deep-links for instant mobile payments.
* **Smart QR Code Handover:** Staff can use their laptop or mobile device's rear camera to scan a student's pickup QR code. The system securely validates the order and hands it over instantly.
* **Admin Dashboard:** Complete control over menu items, pricing, stock availability, and sales analytics.

## 🛠️ Tech Stack

* **Frontend:** React (Vite), React Router, Context API, Lucide Icons, html5-qrcode (for scanner)
* **Backend:** Node.js, Express.js
* **Database:** SQLite (`better-sqlite3`)
* **Authentication:** JSON Web Tokens (JWT), bcrypt
* **Styling:** Vanilla CSS (CSS Variables, Flexbox/Grid, Animations)

## 🚀 Getting Started

To run OrderGo locally on your machine, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/Manish-200793/OrderGo.git
cd OrderGo
```

### 2. Setup the Backend
Open a terminal and navigate to the backend folder:
```bash
cd backend
npm install

# Start the backend server (runs on port 5000 by default)
npm run dev
```
*Note: The SQLite database will be automatically initialized and seeded with dummy data on the first run.*

### 3. Setup the Frontend
Open a **second** terminal window and navigate to the frontend folder:
```bash
cd frontend
npm install

# Start the frontend server with network access and SSL enabled
npm run dev -- --host
```

### 4. Testing the App on Mobile (Camera Access)
Because the app uses a camera for QR scanning, modern browsers require an HTTPS connection.
1. When you start the frontend, Vite will provide a Network IP address (e.g., `https://192.168.x.x:5173`).
2. Type this exact HTTPS address into your phone's browser.
3. Your browser will warn you that the connection is not private (because it's a local development server).
   * **Chrome/Android:** Click "Advanced" -> "Proceed to 192.168.x.x (unsafe)".
   * **Safari/iPhone:** Click "Show Details" -> "visit this website" (at the very bottom).
4. You can now use the Staff Dashboard on your laptop or phone to scan QR codes seamlessly!

## 🔐 Default Test Accounts

Use these accounts to test the different user roles in the application:

* **Admin:** `admin@ordergo.com` / `admin123`
* **Staff:** `staff1@ordergo.com` / `staff123`
* **Student:** `student1@ordergo.com` / `student123`

---
*Built with ❤️ by Manish*
