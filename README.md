# GridWatch ⚡ — Version 1.1
Electrical distribution monitoring prototype (React + Vite + Express + MongoDB + Leaflet).

## Features
- Responsive dashboard for consumers and utility staff
- JWT authentication and role-based access (`consumer`, `technician`, `operator`, `admin`)
- Demo substations, transformers, poles and fault markers on a Leaflet/OpenStreetMap map
- Outage notices with reasons, affected areas, and estimated restoration times
- Electrical damage complaints with optional photo upload, GPS capture and coordinates
- Complaint tracking and staff status updates
- Smart-meter readings page with source/status labels (demo/manual until a real gateway is connected)
- Electricity bills, usage history, and simulated bill payment flow (no real money is charged)
- Seed/demo data is explicitly labelled; no live telemetry is claimed

## Requirements
- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

## Setup
1. Extract the zip.
2. Copy `server/.env.example` to `server/.env` and set `MONGO_URI` and a long `JWT_SECRET`.
3. In a terminal:
   ```bash
   cd server
   npm install
   npm run seed
   npm run dev
   ```
4. In another terminal:
   ```bash
   cd client
   npm install
   npm run dev
   ```
5. Open the Vite URL shown in the terminal (usually http://localhost:5173).

## Demo logins
Run `npm run seed` in `server` to create:
- Admin/operator: `operator@gridwatch.demo` / `GridWatchDemo123!`
- Technician: `technician@gridwatch.demo` / `GridWatchDemo123!`
- Consumer: `consumer@gridwatch.demo` / `GridWatchDemo123!`

Change these credentials and the JWT secret before any deployment.

## Version 1.1 notes\n- After upgrading, run `npm run seed` from `server` again to create the demo meter reading and sample bill. Seeding is safe to re-run for these demo records.\n- Demo consumer login: `consumer@gridwatch.demo` / `GridWatchDemo123!`.\n- Smart meter values are sample/manual records. Real-time readings require a supported smart meter and authorized gateway/API integration.\n- “Pay demo bill” only marks the sample bill paid and creates a simulated reference. It does not process money. Real payments require a payment provider, merchant onboarding, verified webhooks, and server-side payment confirmation.\n- GPS capture requires browser permission and device location services. If unavailable, users can type the location manually.\n\n## Troubleshooting “Failed to fetch” on sign-in\n1. Keep the server terminal running from the `server` folder with `npm run dev`.\n2. Confirm the terminal reports a successful MongoDB connection and the API listening on port 5000.\n3. Open `http://localhost:5000/api/health`; it should return JSON with `status: ok`.\n4. Start the frontend from `client` using `npm run dev`.\n5. If using a different backend port/host, create `client/.env` with `VITE_API_URL=http://localhost:5000/api` (adjust the host/port), then restart Vite.\n\n## API overview
- `POST /api/auth/register` — consumer registration
- `POST /api/auth/login` — login
- `GET /api/assets` — network assets
- `GET /api/outages` — outage notices
- `POST /api/outages` — operator/admin create outage
- `PATCH /api/outages/:id/status` — operator/admin update status
- `GET /api/complaints` — own complaints for consumers; all complaints for staff
- `POST /api/complaints` — create complaint (supports `multipart/form-data`, optional `photo`)
- `PATCH /api/complaints/:id` — staff update status/assignment

## Important production notes
- OpenStreetMap tiles need internet access. Confirm tile usage policy before production-scale use.
- This prototype accepts local photo uploads into `server/uploads`; use object storage, file scanning, file-size limits, and retention policies before deployment.
- Manual outage records are announcements, not sensor detections. Live integration requires an authorized utility/SCADA/IoT data source and secure gateway.
- Do not use demo coordinates as real electrical infrastructure locations.
- For production, add rate limiting, email verification, password reset, audit logging, stronger validation, HTTPS, backups, and security review.
