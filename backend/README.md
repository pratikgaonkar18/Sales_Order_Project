# Order Workflow Backend

Spring Boot API for internal Sales Order engineering workflow tracking.

## Stack

- Spring Boot 3.4
- MySQL 8
- Flyway migrations

## Setup

### 1) Start MySQL

If you use Docker:

```powershell
docker compose up -d
```

This creates the `order_workflow` database automatically.

If you use a local MySQL installation instead of Docker, create the database before first run:

```sql
CREATE DATABASE order_workflow;
```

### 2) Configure database connection

Set environment variables (optional if using defaults):

- `DB_URL` (default: `jdbc:mysql://localhost:3306/order_workflow?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`)
- `DB_USERNAME` (default: `root`)
- `DB_PASSWORD` (default: `root`)

### 3) Run the backend

```powershell
.\mvnw.cmd spring-boot:run
```

## When to create database and tables

1. Create database once before first backend startup (or let Docker do it).
2. Do not manually create tables.
3. Flyway creates all tables automatically on first app startup from:
   - `src/main/resources/db/migration/V1__initial_schema.sql`

## Initial API endpoints

- `POST /api/orders` create order with line items
- `GET /api/orders/{id}` fetch one order summary
- `POST /api/orders/{id}/stage` move workflow stage
- `GET /api/orders/dashboard?openOnly=true` dashboard list
- `GET /api/orders/search` combined search using query params:
   - `customerName`
   - `partNumber`
   - `salesOrderNo`
   - `referenceSerial`
- `GET /api/orders/search/customer?value=ABC`
- `GET /api/orders/search/part-number?value=92154-01`
- `GET /api/orders/search/sales-order?value=SO-012527`
- `GET /api/orders/search/reference-serial?value=001177-0101`

## Frontend development

The React frontend is in the sibling folder `../frontend`.

1. Start backend first.
2. In a new terminal:

```powershell
cd ..\frontend
npm run dev
```

The Vite dev server runs at `http://localhost:5173` and proxies `/api` calls to `http://localhost:8080`.
