﻿# 🛒 Bazaar - Inventory Management System (Backend)

A secure, scalable, and auditable backend service built for managing product inventory, supporting thousands of stores, concurrent operations, and real-time stock synchronization. Developed with a RESTful architecture using Node.js, Express, PostgreSQL, Redis, and JWT authentication.

---

## ✅ Key Features

- 🔐 **JWT-Based User Authentication** (per store access)
- 🏪 **Multi-Store Inventory Isolation** (500+ store support)
- 📦 **Stock Movement Tracking** (stock-in, sale, manual removal)
- 📊 **Date-Based Reporting and Filtering**
- 🛡️ **Negative Stock Prevention**
- 🔄 **Asynchronous Audit Logging via Event Emitters**
- 🧠 **Redis Caching** for optimized product queries
- ⚙️ **API Rate Limiting** with `express-rate-limit`
- 📋 **Audit Logs** for all mutations (create/update/delete)
- 🧱 **PostgreSQL Relational Modeling**
- 🏗️ **Scalable Architecture** (Stage 3)

---

## 🧩 Evolution Overview

### 🔷 Stage 1 - Single Store Foundation
- CLI and REST APIs for managing a single kiryana store
- Tracked stock-in, sale, and manual removals
- Data was stored locally (MySQL DB)

### 🔷 Stage 2 - Multi-Store Support (500+)
- PostgreSQL migration with relational modeling
- Introduced stores table with `store_id` to all key tables (users, stock, movements)
- Per-store access enforced via JWT and middleware
- RESTful API support for date filtering, low stock alerts, and store creation
- Caching with Redis and API rate limiting

### 🔷 Stage 3 - Scalable, Auditable System (1,000+ stores)
- ✅ Event-driven audit logging using Node.js EventEmitter
- ✅ Redis-based caching for stock reports (low-stock lists)
- ✅ Real-time audit log insertion (async-safe)
- ✅ Modular rate limiting and scalable routing
- 🔄 Prepared foundation for async tasks (can be extended to workers)
- 🧠 Logged every data mutation (insert/update/delete) with actor, store, and action details

---

## 🛠️ Installation & Setup

```bash
git clone https://github.com/Anacex/BAZAAR
cd BAZAAR/backend
npm install
```

### 📄 `.env` Configuration

```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=bazaar_inventory
DB_PORT=5432
JWT_SECRET=BAZAAR
JWT_EXPIRES_IN=1h
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 🔃 Start Services

- Start PostgreSQL and Redis (via `redis-server`)
- Start backend server:

---

## 🧪 API Endpoints

### 🔐 Authentication
| Endpoint           | Method | Description         |
|--------------------|--------|---------------------|
| `/auth/register`   | POST   | Register user       |
| `/auth/login`      | POST   | Login and get token |
| `/auth/test-hash`  | POST   | Bcrypt testing util |

### 🏬 Stores
| Endpoint         | Method | Description         |
|------------------|--------|---------------------|
| `/stock/stores`  | POST   | Create store        |
| `/stock/stores`  | GET    | Get all stores      |
| `/stock/stores/:id` | GET | Get store by ID     |

### 📦 Stock Movements
| Endpoint                      | Method | Description                              |
|-------------------------------|--------|------------------------------------------|
| `/stock/movements`           | GET    | Filterable by date and product ID        |
| `/stock/movements`           | POST   | Add stock movement (with store scope)    |
| `/stock/movements/:id`       | PUT    | Update movement quantity                 |
| `/stock/movements/:id`       | DELETE | Delete movement safely                   |

### 🏷️ Products
| Endpoint                     | Method | Description                      |
|------------------------------|--------|----------------------------------|
| `/stock/products`           | GET    | Get all products                 |
| `/stock/products`           | POST   | Create new product               |
| `/stock/products/low-stock` | GET    | Filter low stock products        |

---

## 🚨 Security

- Passwords hashed with **bcrypt**
- JWT auth with **store-level role enforcement**
- API requests throttled with **rate limiting**
- SQL injection protected with **parameterized queries**
- Redis-based caching prevents frequent DB hits
- Full **audit logs** for all data-changing operations

---

## 🔄 Audit Logs (Stage 3)

- Events are **emitted** for actions like `create_stock`, `update_stock`, `delete_movement`, etc.
- Logs stored in a separate `audit_logs` table with:
  - `user_id`
  - `store_id`
  - `action` (e.g., `update_stock`)
  - `details`
  - `timestamp`
- All write operations (POST/PUT/DELETE) emit these events for **non-blocking async logging**

---

## 🧠 Tech Stack

- **Node.js** + **Express**
- **PostgreSQL** + `pg`
- **Redis**
- **JWT** for secure auth
- **EventEmitter** for async logging
- **BcryptJS** for password security
- **express-rate-limit** for throttling
- **dotenv** for configuration

---

## 📂 Project Structure

```
```
BAZAAR/
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   ├── eventEmitter.js
│   │   └── redisClient.js
│   ├── database/
│   │   ├── populate.sql
│   │   ├── schema.sql
│   │   └── testing.txt
│   ├── middleware/
│   │   └── authMiddleware.js
│   └── routes/
│       ├── authRoutes.js
│       ├── stockRoutes.js
│       └── tempCodeRunnerFile.js
├── SingleStoreBackendFiles/        #stage 1 archived code
├── src/
├── .gitignore
├── package-lock.json
├── server.js                       #run this file
├── tempCodeRunnerFile.js
├── testDB.js
├── verification commands.txt
├── node_modules/
├── .env                           #environment variables
├── {}
├── Case Study Challenge _ Engin...   #requirements document
├── package-lock.json
├── package.json
└── README.md
```

---

## 👨‍💻 Example CURL

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "manager", "password": "1234", "store_id": 1}'
```

---

## 📌 Notes for Reviewer

- Designed and built for **horizontal scalability**.
- Follows security and architectural best practices.
- Audit logs ensure traceability and accountability.
- Easily extendable to real-time dashboards and supplier APIs.

---

## 👨‍🎓 Author

**Muhammad Anas Khan**  
FAST - National University of Computer & Emerging Sciences  
Computer Science (Roll: 22K-4170)

