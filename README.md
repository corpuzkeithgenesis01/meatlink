# MeatLink

A web-based marketplace for local meat sellers and bulk buyers.

## Description

MeatLink is a responsive progressive web app (PWA) that connects local chicken and pork sellers, starting with Diamsay Meat Shop, to retail and wholesale buyers like households and schools. Sellers manage products, prices, stock, and orders through a React admin dashboard connected to a Node.js API and database. Buyers can sign up, browse cuts, place orders, chat with sellers in real time, and receive order notifications.

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js, Express
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT, bcrypt
- **Real-time chat:** Socket.io

## Project Structure

```
meatlink/
├── backend/    Node.js API
└── frontend/   React app
```

## How to Run

### 1. Clone the repository

```bash
git clone https://github.com/USERNAME/meatlink.git
cd meatlink
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:5000`. To check the database connection, open `http://localhost:5000/api/health`.

### 3. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173`.

## Environment Variables

Create a `.env` file in each folder. Ask a team member for the values.

**backend/.env**

```
PORT=
SUPABASE_URL=
SUPABASE_KEY=
JWT_SECRET=
```

**frontend/.env**

```
VITE_API_URL=
```

## Team

- Genesis: Products and Admin
- Jessa: Authentication and Orders
- Shereen: Real-time Chat and PWA