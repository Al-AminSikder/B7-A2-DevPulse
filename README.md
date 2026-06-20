# DevPulse 🚀

DevPulse is a robust, production-ready backend API engine designed for tracking software development lifecycles, user authentication, and issue management. Built with **TypeScript**, **Express**, and **PostgreSQL**, it is engineered to run seamlessly on serverless infrastructure via **Vercel** and **NeonDB**.

## 🌐 Live Deployment
* **API Production URL:** [https://b7-a2-dev-pulse-psi.vercel.app](https://b7-a2-dev-pulse-psi.vercel.app)
* **Health Check Endpoint:** `https://b7-a2-dev-pulse-psi.vercel.app/api/issues`

---

## 🛠️ Core Tech Stack
* **Runtime Environment:** Node.js (v18+)
* **Language:** TypeScript 
* **Framework:** Express.js
* **Database Platform:** Neon (Serverless PostgreSQL)
* **Database Driver:** `pg` (Node-Postgres connection pool)
* **Deployment Platform:** Vercel (Serverless Functions)

---

## 💾 Database Architecture & Schema

The underlying database relies on a relational architecture optimized with native PostgreSQL check constraints and automatic timestamp automation using conditional database triggers.

### Workflow Triggers
A native PL/pgSQL function automatically enforces data integrity on update cycles:
* `update_modified_column()`: Fires automatically `BEFORE UPDATE` on any row within the `users` or `issues` tables to match `updated_at` to `NOW()`.

### Data Models
1. **Users Table (`users`)**
   * Fields: `id` (Serial PK), `name`, `email` (Unique), `password`, `role` (`contributor`, `maintainer`), timestamps.
2. **Issues Table (`issues`)**
   * Fields: `id` (Serial PK), `title`, `description`, `type` (`bug`, `feature_request`), `status` (`open`, `in_progress`, `resolved`), `reporter_id` (FK to Users), timestamps.

---

## 🛣️ API Endpoints

### 🔑 Authentication Modules (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Registers a new team contributor or maintainer | Public |
| `POST` | `/api/auth/login` | Validates credentials and returns session tokens | Public |

### 🐛 Issue Tracking Modules (`/api/issues`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/issues` | Retrieves all registered bugs and feature requests | Public/Private |
| `POST` | `/api/issues` | Creates a new structured development issue | Contributor+ |

> ⚠️ **Data Validation Guard:** The database strictly rejects issues where `type` is not exactly `bug` or `feature_request`, or where `status` is outside of `open`, `in_progress`, or `resolved`.

---
