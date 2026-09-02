# Roots Café — Admin Portal

React admin portal for staff and managers. See the [root README](../README.md) for architecture, env vars, and full-stack setup.

## Setup

```bash
cd admin
cp .env.example .env
npm install
npm run dev
```

Admin: `http://localhost:5173`

Set `VITE_API_URL` to the NestJS API (default `http://localhost:3000`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
