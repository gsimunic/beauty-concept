# Salon Mini-ERP (Next.js 14)

Production-ready internal mini-ERP for a beauty salon.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL (Neon/Supabase compatible)
- NextAuth (Credentials, single `ADMIN` role)
- Tailwind CSS
- Zod validation
- Excel export with `exceljs`

## Features

- Modules: Clients, Treatments, Appointments, Products, Sales, Expenses, Gift Vouchers
- Financial logic:
  - Revenue from `DONE` appointments
  - Revenue from product sales
  - Monthly revenue/expenses/profit
- Dashboard:
  - Current month revenue
  - Current month expenses
  - Current month profit
  - Low stock alerts
  - Appointments count this month
- Excel exports:
  - Monthly financial report
  - Client list
- Session-based auth with one admin user
- Route protection via middleware

## Project Structure

```text
.
├── prisma
│   ├── schema.prisma
│   └── seed.ts
├── src
│   ├── app
│   │   ├── (auth)/login
│   │   ├── (dashboard)
│   │   │   ├── appointments
│   │   │   ├── clients
│   │   │   ├── dashboard
│   │   │   ├── expenses
│   │   │   ├── products
│   │   │   ├── reports
│   │   │   ├── sales
│   │   │   ├── treatments
│   │   │   └── vouchers
│   │   ├── api
│   │   │   ├── auth/[...nextauth]
│   │   │   ├── appointments
│   │   │   ├── clients
│   │   │   ├── expenses
│   │   │   ├── products
│   │   │   ├── reports
│   │   │   ├── sales
│   │   │   ├── treatments
│   │   │   └── vouchers
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── layout
│   │   └── ui
│   ├── lib
│   │   ├── actions.ts
│   │   ├── auth.ts
│   │   ├── excel.ts
│   │   ├── prisma.ts
│   │   ├── services/finance.ts
│   │   ├── utils.ts
│   │   └── validators
│   ├── middleware.ts
│   └── types/next-auth.d.ts
├── .env.example
├── package.json
└── README.md
```

## Environment Variables

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: random secret
- `NEXTAUTH_URL`: app URL (`http://localhost:3000` local)
- `ADMIN_EMAIL`: seed admin email
- `ADMIN_PASSWORD`: seed admin password

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Generate Prisma client

```bash
npm run prisma:generate
```

3. Run migrations

```bash
npm run prisma:migrate -- --name init
```

4. Seed initial data (admin + sample treatments/products)

```bash
npm run db:seed
```

5. Start dev server

```bash
npm run dev
```

6. Login at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Prisma Migration Instructions

- New local migration:

```bash
npm run prisma:migrate -- --name <migration_name>
```

- Apply existing migrations in production:

```bash
npm run prisma:deploy
```

## API Endpoints

- `GET/POST /api/clients`
- `GET/PUT/DELETE /api/clients/:id`
- `GET/POST /api/treatments`
- `GET/PUT/DELETE /api/treatments/:id`
- `GET/POST /api/appointments`
- `GET/PUT/DELETE /api/appointments/:id`
- `GET/POST /api/products`
- `GET/PUT/DELETE /api/products/:id`
- `GET/POST /api/sales`
- `GET/PUT/DELETE /api/sales/:id`
- `GET/POST /api/expenses`
- `GET/PUT/DELETE /api/expenses/:id`
- `GET/POST /api/vouchers`
- `GET/PUT/DELETE /api/vouchers/:id`
- `GET /api/reports/financial/monthly?month=YYYY-MM`
- `GET /api/reports/clients`

## Deployment (Vercel + Neon/Supabase)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Configure environment variables in Vercel:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (set to production domain)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
4. Set build command (default works):

```bash
npm run build
```

5. After first deploy, run seed once against production database.
6. Use `npm run prisma:deploy` in CI/CD or Vercel post-deploy step to apply migrations.

## Notes

- Internal app only; no public booking flow.
- Only one `ADMIN` user role enabled now.
- `ProductSale` creation automatically decrements stock and validates availability.
- Appointment revenue counts only records with status `DONE`.
