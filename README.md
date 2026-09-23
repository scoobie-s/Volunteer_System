# CRC Volunteer Management System

Next.js volunteer operations platform for CRC Church with multi-campus structure, QR badges,
attendance tracking, access point control, and reporting.

## Stack

- Next.js App Router + TypeScript
- Prisma schema for PostgreSQL / Neon
- Tailwind CSS
- Zod validation
- QR generation with camera scanner support

## Run locally

```bash
npm install
npm run prisma:generate
npm run dev
```

## Volunteer photo storage

Create a Vercel Blob store and add its read/write token as `BLOB_READ_WRITE_TOKEN` in the local and Vercel production environments. New volunteer photos will then be stored in Blob while the existing volunteer screens continue using the same image field.

After configuring the token, migrate existing database-embedded photos once:

```bash
npm run migrate:volunteer-photos
```

Without the token, the app keeps the existing database fallback so local development continues to work.

The app uses PostgreSQL/Neon by default. Mock-mode fallbacks are now opt-in for local development only:

```bash
copy .env.example .env
# set DATABASE_URL
# optionally set ALLOW_MOCK_DATA=true and ALLOW_MOCK_AUTH=true only for local development
npm run prisma:push
npm run prisma:seed
npm run dev
```

## Routes

- `/` dashboard
- `/volunteers` volunteer registry and QR badges
- `/events` event setup
- `/access` access point configuration and logs
- `/scanner` attendance/access scanner
- `/reports` reporting
- `/badges/[token]` printable volunteer badge

## Notes

- API routes are available under `/api/volunteers`, `/api/events`, `/api/access`, and `/api/scan`.
- Notifications are persisted in the database and exposed via `/api/notifications`.
- The scanner accepts live camera scans and manual QR token input for desktop testing.
- Login codes are stored as hashes in the database.
