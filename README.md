# Roots Café — Admin Portal

React admin portal for staff and managers.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Admin: `http://localhost:5173`

Set `VITE_API_URL` to the NestJS API (e.g. `https://backend-root-cafe-main-production.up.railway.app` or `http://localhost:3000`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run oxlint |
