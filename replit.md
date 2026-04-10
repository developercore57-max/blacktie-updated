# Black Tie VoIP Reseller Portal

## Overview

Full-stack VoIP Reseller Portal built with React/Vite frontend, Express 5 backend, and PostgreSQL database. Supports two panels: Admin and Reseller.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Session**: connect-pg-simple (PostgreSQL-backed sessions)
- **Authentication**: bcryptjs (password hashing) + express-session
- **Email**: nodemailer
- **File uploads**: multer (memoryStorage) + Replit Object Storage (GCS-backed, persistent)
- **API client**: Generated with orval from OpenAPI spec

## Artifacts

- `artifacts/api-server` - Express API server (port 8080)
- `artifacts/voip-portal` - React/Vite frontend (port 20699)

## Database

36 PostgreSQL tables covering: admins, company_settings, resellers, clients, dids, orders, catalog items, chat, documents, coverage checks, number porting, etc.

### Catalog Data (fully populated)
- **VoIP**: 5 categories (Single Line, Hosted PBX, SIP Trunk, Call Centre, Fax to Email), 8 items
- **Minute Bundles**: 5 bundles (150, 300, 500, 1000 min + International)
- **Products**: 6 categories, 8 items (Yealink T31P/T46U, Grandstream GXP1620/GXP2160/DP730/WP816, Jabra, Yealink MVC320)
- **Web Hosting**: 4 packages (Starter, Business, Professional, Enterprise)
- **Domain TLDs**: 7 (.co.za, .com, .net, .org, .biz, .africa, .io)
- **Connectivity**: 4 categories, 10 items (FTTH/FTTB/LTE/SD-WAN)
- **Services**: 4 categories, 9 items (IT Support, PBX, M365, VPS)
- **Cybersecurity**: 4 categories, 7 items (Endpoint, Network, Email, VPN)
- **Data Security**: 3 categories, 6 items (Cloud Backup, DRaaS, Archiving)
- **Web Dev**: 4 categories, 9 items (Websites, E-Commerce, Maintenance, SEO/Ads)

### DB Rules
- **Development DB**: uses `DATABASE_URL` (Replit-managed PostgreSQL) — has test data
- **Production DB**: uses `PROD_DATABASE_URL` (Neon PostgreSQL) — requires this secret in production; missing it causes an immediate startup failure (no fallback)
- `NODE_ENV=production` is set by the deployment config — this is what switches which DB is used
- **Schema changes**: add missing columns to `artifacts/api-server/src/migrate.ts` with `IF NOT EXISTS`
- `migrate.ts` runs automatically at server startup. Data seeding (autoSeedIfEmpty) is skipped in production
- **Dev push**: `pnpm --filter @workspace/db run push`
- **Prod push** (schema only): `pnpm --filter @workspace/db run push-prod`

### Production Accounts (Neon DB)
**Admin**
- Email: `admin@blacktievoip.co.za`
- Password: `password123`

**Reseller**
- Email: `reseller@blacktievoip.co.za`
- Password: `password123`

### Dev Credentials
**Admin**: `admin@blacktievoip.co.za` / `password123`
**Reseller**: `reseller@blacktievoip.co.za` / `password123`
(login page defaults to "Reseller" tab — click "Admin" tab first for admin login)

### Coverage Check Requests Table
All 22 columns confirmed in Neon DB including the 8 newer fields: `service_type`, `unit_street_number`, `building_complex`, `street_name`, `address2`, `contact_name`, `contact_email`, `contact_phone`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `DATABASE_URL=$DATABASE_URL npx tsx artifacts/api-server/src/seed.ts` — seed admin user

## Project Structure

```
artifacts/
  api-server/src/
    app.ts          - Express app setup with sessions and CORS
    routes/         - All API route handlers (13 route files)
    lib/
      email.ts        - Nodemailer integration
      logger.ts       - Pino logger
      gcsStorage.ts   - GCS helper: uploadBuffer, downloadBuffer, deleteObject, streamToResponse
  voip-portal/src/
    App.tsx         - Main router with all page routes
    pages/
      login.tsx         - Login/register page
      admin/            - Admin panel pages
      reseller/         - Reseller panel pages
    components/
      ui/              - shadcn/ui components
      layout/          - Layout components
lib/
  db/src/
    schema/          - 36 PostgreSQL table schemas
    index.ts         - DB connection + drizzle-orm operator exports
  api-client-react/src/
    generated/       - Orval-generated API hooks and schemas
    custom-fetch.ts  - Custom fetch implementation
```

## Object Storage (File Uploads)

Documents and number-porting attachments are stored in Replit's GCS-backed Object Storage.

- **Bucket**: Set via `DEFAULT_OBJECT_STORAGE_BUCKET_ID` env var (provisioned via `setupObjectStorage()`)
- **GCS path format for documents**: `documents/<uuid>.<ext>` (stored in `storedName` column)
- **GCS path format for porting files**: `porting/<uuid>.<ext>` (bare `<uuid>.<ext>` stored in `storedName` JSON field; prefix is added server-side)
- **Helper**: `artifacts/api-server/src/lib/gcsStorage.ts` — `uploadBuffer`, `downloadBuffer`, `deleteObject`, `streamToResponse`
- **Auth**: Replit sidecar endpoint `http://127.0.0.1:1106` handles GCS credentials automatically
- **Old documents** (before migration, with bare UUID `storedName`) return 404 gracefully — no crash

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
