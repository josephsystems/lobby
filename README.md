# 🚀 Lobby

<p align="center">
  <strong>The self-hosted, headless waitlist API. Define custom schemas in seconds, own your data, and deploy anywhere.</strong>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/DX-Clone%20%26%20Run-brightgreen" alt="DX"></a>
  <a href="https://github.com/josephsystems/lobby/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green" alt="Node.js"></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-%3E%3D10.33.4-orange" alt="pnpm"></a>
</p>

---

## ⚡ What is Lobby?

Lobby is an open-source, developer-first, self-hosted waitlist backend. Traditional waitlist SaaS platforms lock your data behind their subscription models, enforce rigid fields, and limit customizations. Lobby solves this by giving you:

- **Complete Data Ownership**: Your signups live entirely in your own PostgreSQL database.
- **100% Headless & Customizable**: Define your waitlist's name and schema with an interactive wizard, plug it into your custom frontend, and walk away.
- **Instant Deployments**: Go from a blank terminal to a fully functional, production-ready waitlist API in less than **5 minutes**.
- **Zero Data Loss Migrations**: Safely add, modify, or remove signup fields post-launch using automatically generated SQL migrations.

---

## 🛠️ Tech Stack & Architecture

Lobby is engineered with high-performance, industry-standard modern web technologies:

- **Framework**: [NestJS 11](https://nestjs.com/) — reliable, scalable, and highly structured.
- **Database Interface**: [Kysely](https://kysely.dev/) — ultra-fast, SQL-injection safe, and fully type-safe dynamic SQL compiler.
- **Data Layer**: [PostgreSQL](https://www.postgresql.org/) — robust relational database.
- **Queuing & Workers**: [BullMQ](https://bullmq.io/) & [Redis](https://redis.io/) — transactional mail queuing for heavy signup loads.
- **Communications**: [Resend](https://resend.com/) — modern developer-friendly transactional email service.
- **CLI Wizard**: [Clack (`@clack/prompts`)](https://github.com/clackjs/clack) — beautiful, interactive console prompts.

### 📐 How Lobby Works

```mermaid
sequenceDiagram
    autonumber
    actor Developer
    actor User as Signup Client
    participant CLI as Lobby CLI Setup
    participant API as Lobby NestJS API
    participant DB as PostgreSQL
    participant Redis as BullMQ Redis
    participant Resend as Resend SDK

    Note over Developer, DB: 1. Setup Phase
    Developer->>CLI: pnpm run setup
    CLI->>Developer: Prompts (Waitlist name, fields, email configs)
    CLI->>Developer: Generates lobby.config.json & SQL migration file
    Developer->>DB: pnpm run migration:run (Applies schema transactions)

    Note over User, Resend: 2. Runtime Phase
    User->>API: POST /api/v1/waitlist/join (dynamic data payload)
    API->>API: Validates data types against lobby.config.json at runtime
    API->>DB: Check for duplicate emails & atomic position assignment (via DB sequence)
    DB-->>API: Returns assigned waitlist position
    API->>Redis: Enqueues SEND_CONFIRMATION_EMAIL job (if enabled)
    API-->>User: Returns 201 Created (ID, position, success message)

    Note over Redis, Resend: 3. Background Mail Worker
    Redis->>API: BullMQ Processor pulls active mail job
    API->>Resend: Dispatches custom email variables
```

---

## ⚡ Quick Start (Under 5 Minutes)

Deploying your waitlist backend is straightforward. Ensure you have **Node.js (>=22.0.0)** and **pnpm (>=10.33.4)** installed, and a PostgreSQL instance ready.

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/josephsystems/lobby.git
cd lobby
pnpm install
```

### 2. Run the Interactive Setup Wizard

Kick off the setup CLI to configure your waitlist, select built-in fields (first/last names), and define custom field names and types:

```bash
pnpm run setup
```

This command generates:

- `lobby.config.json` — the source of truth for your waitlist schema.
- `migrations/{timestamp}_initial_setup.sql` — a custom SQL migration mapping your fields directly into PostgreSQL.

### 3. Configure Environment Variables

Copy the template `.env.example` to `.env` and fill in your connection details:

```bash
cp .env.example .env
```

Key configuration properties:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/lobby_db?schema=public"
APP_DOMAIN="yourproduct.com"

# Optional: Set to true if you enabled email confirmations during setup
EMAIL_ENABLED=false
REDIS_HOST="localhost"
REDIS_PORT=6379
RESEND_API_KEY="re_..."
RESEND_CONFIRMATION_TEMPLATE_ID="d3..."
```

### 4. Run Migrations & Start Lobby

Apply the migration files to construct your custom Postgres table and start your backend:

```bash
pnpm run migration:run
pnpm run start:dev
```

Your waitlist API is now active at `http://localhost:3000/api/v1`! 🚀

---

## ⚙️ Schema & Field Management

One of Lobby's core capabilities is evolving your signup forms over time without losing user records or manually writing SQL.

### Add New Fields

Need to collect more information (e.g., product tier or twitter handle)? Run:

```bash
pnpm run fields:add
```

This interactive script asks for your new field definition, updates your `lobby.config.json`, and automatically outputs a safe `ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS ...` migration file.

### Edit Existing Fields

To modify field configurations, change required status, delete fields, or update data types:

```bash
pnpm run fields:edit
```

This CLI scans your current configurations, prompts you for changes, and generates a corresponding database migration with safety warnings (e.g., if you are converting a nullable field to `NOT NULL` or casting a type).

_Run `pnpm run migration:run` after modifying your schema to apply changes to your database._

---

## 🔌 API Reference

### 1. Join the Waitlist

Submits a signup request. Dynamic fields are added to `fields` and validated against the schema defined in `lobby.config.json`.

- **Route**: `POST /api/v1/waitlist/join`
- **Content-Type**: `application/json`

#### Example Payload:

```json
{
  "email": "developer@rota.ng",
  "fields": {
    "first_name": "Ada",
    "last_name": "Lovelace",
    "phone": "+2348000000000",
    "school_name": "Rota Technical College",
    "school_address": "123 Innovation Drive"
  }
}
```

#### Successful Response (`201 Created` for new signups):

```json
{
  "id": "2e6b223c-f4e1-456b-be39-2a912bb0e7b8",
  "email": "developer@rota.ng",
  "position": 42,
  "message": "You're on the list!",
  "isNew": true
}
```

#### Idempotency Check (`200 OK` for existing emails):

Submitting the same email again is safe and returns the user's existing queue position:

```json
{
  "id": "2e6b223c-f4e1-456b-be39-2a912bb0e7b8",
  "email": "developer@rota.ng",
  "position": 42,
  "message": "You're already on the list!",
  "isNew": false
}
```

---

### 2. Query Waitlist Position

Retrieves a user's current place in the waitlist queue.

- **Route**: `GET /api/v1/waitlist/position`
- **Query Parameters**:
  - `email` (string, required)

#### Example Request:

```http
GET /api/v1/waitlist/position?email=developer@rota.ng
```

#### Successful Response (`200 OK`):

```json
{
  "email": "developer@rota.ng",
  "position": 42
}
```

---

## 🔒 Security & CORS

Lobby is a public-facing API but contains rigorous protection to prevent malicious third parties from spamming your backend from random origins:

- **Origin Restriction**: Lobby dynamically compiles regular expressions from the `APP_DOMAIN` env variable.
- **CORS Behavior**:
  - **Production (`NODE_ENV=production`)**: Strictly allows requests only from `https://yourproduct.com` and its HTTPS subdomains.
  - **Staging**: Allows standard localhost routes plus your secure production domains.
  - **Development**: Automatically permits localhost ports (`http://localhost:*`).

---

## 📦 Deployment Options

### 1. Serverless (Vercel)

Lobby is optimized for lightweight execution. For Vercel hosting:

1. Link your repository to a Vercel Project.
2. Spin up a [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) instance.
3. Configure the environment variables in Vercel to point `DATABASE_URL` to your database.
4. Set `EMAIL_ENABLED=false` or configure external Redis connection values (like [Upstash Redis](https://upstash.com/)) to use BullMQ queues.

### 2. VPS & Self-Hosted (Docker)

Lobby ships with a multi-stage `Dockerfile` and a simple `docker-compose.yml` for unified hosting with PostgreSQL and Redis.

To spin up the entire cluster:

```bash
docker-compose up -d --build
```

Lobby will spin up, automatically detect PostgreSQL and Redis services, run any pending SQL migrations on container startup, and start listening on port `3000`.

---

## 🚧 Roadmap

Lobby's architecture is fully structured, leaving room for expansion in upcoming minor and major releases:

- **v0.7.0** _(Current)_: Core dynamic API, setup CLI, BullMQ email dispatchers, dynamic CORS.
- **v1.0.0**: CLI-based dynamic field modification scripts (`pnpm run fields:add`/`edit`).
- **v1.1.0**: Secure Admin Dashboard endpoints (`/admin/entries`) with CSV exports, protected via custom API key middleware.
- **v1.2.0**: One-click cloud templates (Railway, Render, Fly.io).

---

## 📄 License

Lobby is open-source software licensed under the [MIT License](LICENSE).
