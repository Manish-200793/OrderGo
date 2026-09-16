# 🍔 OrderGo - College Canteen Management System

**Specathon 3rd Prize Winning Project**

OrderGo is a highly scalable, real-time digital cafeteria management application designed to eliminate long queues, improve canteen efficiency, and provide transparent order tracking for college campuses.

---

## 🛠 Tech Stack & Architecture

This project is built using a modern **MERN-like stack** (using MySQL instead of MongoDB).

### Frontend (Client)
- **Framework:** React.js (Bootstrapped with Vite)
- **Styling:** Vanilla CSS (Custom design system, glassmorphism UI)
- **Routing:** `react-router-dom`
- **Real-Time Communications:** `socket.io-client`
- **Hosting:** Designed to be hosted on Netlify or Vercel

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-Time Communications:** `socket.io`
- **Authentication:** JSON Web Tokens (JWT) & bcrypt for password hashing
- **Caching:** `node-cache` (In-memory caching for high-speed menu delivery)
- **Security:** `helmet`, `cors`, `express-rate-limit` (DDoS and spam protection)
- **Hosting:** Designed to be hosted on Render.com

### Database & External Services
- **Database:** MySQL (Hosted on Aiven.io)
  - Interacted with via `mysql2/promise` using Connection Pooling.
- **Email Service:** SendGrid (Used for OTPs and notifications)

---

## ⚙️ How the Application Works (Data Flow)

Understanding the data flow is crucial for maintaining and upgrading the app.

1. **Authentication:** 
   Users (Students, Staff, Admins) log in. The backend issues a JWT token. This token is stored in the browser's `localStorage` and sent in the `Authorization` header for all subsequent API requests.
2. **Menu Loading (Optimized):**
   When a student opens the menu, the request hits the `menuController.js`. Thanks to the `node-cache` implementation, if the menu was requested in the last 5 minutes, it is served instantly from RAM, completely bypassing the MySQL database.
3. **Placing an Order:**
   - The student adds items to the cart and selects a payment method (Cash or UPI).
   - The frontend sends a POST request to `/api/orders`.
   - The backend deducts stock from `menu_items`, creates a record in `orders`, creates individual records in `order_items`, and generates a unique QR Code.
4. **Real-Time Kitchen Updates:**
   - The moment the order is successfully saved to the database, the backend emits a `new_order` event via WebSockets (`socket.io`).
   - The `StaffDashboard.jsx` (running on a tablet in the kitchen) is constantly listening to this WebSocket. It receives the event and instantly updates the screen with the new order—no manual refreshing required.
5. **Pickup Verification:**
   - When the food is ready, the student walks to the counter and shows their QR code.
   - The staff uses the built-in QR Scanner in the Staff Dashboard to scan the code. This makes an API call to verify the order and marks it as `completed`.

---

## 🚀 Pre-Launch Checklist (What needs to be updated before going live)

To launch this application to thousands of students, the following business and technical tasks must be completed:

### 1. Payment Gateway Integration (Technical)
Currently, the UPI payment option is a "mock" implementation. 
- **Action Required:** You must integrate **Razorpay** or **Stripe**.
- **Where to update:** 
  - Create a Razorpay account and get API keys.
  - Update `backend/src/routes/paymentRoutes.js` and `backend/src/controllers/paymentController.js` to handle webhook callbacks from Razorpay.
  - Update the frontend Checkout process to render the Razorpay popup.

### 2. Environment Variables & Production Secrets (Technical)
Ensure that your `.env` files on Render and Netlify contain production-ready secrets, not local development keys.
- **Action Required:** Ensure `JWT_SECRET`, `DATABASE_URL` (Aiven), and `SENDGRID_API_KEY` are securely set in the Render dashboard.

### 3. Hardware Setup (Logistical)
The WebSocket architecture requires the kitchen staff to have a dedicated, always-on screen.
- **Action Required:** Secure a dedicated Android Tablet or monitor for the canteen kitchen. Ensure it is connected to a stable WiFi network so it never drops the Socket.io connection.

### 4. Canteen Contractor Onboarding (Business)
The app is useless if the kitchen staff refuses to look at the tablet.
- **Action Required:** Train the canteen contractor on how to use the Staff Dashboard (marking items as preparing, scanning QR codes, marking items out of stock).

---

## 💻 Developer Setup (Running Locally)

To run this project on your local machine:

1. **Clone the repository**
2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   # Create a .env file with DATABASE_URL, JWT_SECRET, SENDGRID_API_KEY
   npm run dev
   ```
3. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   # Create a .env file with VITE_API_URL=http://localhost:5000
   npm run dev
   ```

*Documentation created for the OrderGo Team.*
