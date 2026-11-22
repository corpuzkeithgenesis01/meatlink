# MeatLink — Deployment sa Render

Layout:
- **meatlink-api** (Node/Express + Socket.io) → `https://meatlink-api.onrender.com`
- **meatlink-web** (React/Vite static site) → `https://meatlink-web.onrender.com`
- Database: existing Supabase project (hindi ito ide-deploy; naka-connect lang)

Ang `render.yaml` sa repo root ay Blueprint — awtomatikong gagawa ng dalawang service sa Render.

> **UI update:** May local product illustrations na sa `frontend/public/images/` (SVG), kaya hindi na kailangan ng external image host. Hindi na rin naka-track ang `.env` at `node_modules` sa git — itakda ang lahat ng secrets sa Render Dashboard bago mag-deploy.

---

## Bago mag-deploy ⚠️

Ang mga secrets (Supabase key, JWT secret, VAPID keys) ay **nalantad na sa chat/script files** habang nagde-develop. Bago gawing pampubliko ang app:

1. Supabase → **Settings → API** → i-rotate ang keys.
2. Gumawa ng **bagong random JWT_SECRET**.
3. Gumawa ng **bagong VAPID keys** (`npx webpush generate-vapid-keys` sa `backend/`).
4. I-update ang local `backend/.env`, tapos i-run ulit ang migrations.

Kung demo/practice lang at pansamantala, pwede muna ang lumang values — pero **huwang i-paste ang secrets sa chat**. Ilalagay mo mismo sa Render Dashboard.

---

## Steps

### 1. Gumawa ng Render account
- Pumunta sa <https://render.com>
- I-click ang **Sign Up** → piliin ang **GitHub** (mas madali, makakonekta agad ang repo)
- I-authorize ang GitHub account mo

### 2. Gumawa ng Blueprint
- Sa Render Dashboard, i-click ang **New** (itaas na kanan) → **Blueprint Instance**
- I-click ang **Connect** sa tab tabi ng repo: `corpuzkeithgenesis01/meatlink`
- Piliin ang branch: **`main`**
- Hintayin ang "Blueprint validated" — makikita ang dalawang service (`meatlink-api`, `meatlink-web`)
- I-click ang **Apply**

### 3. Ilagay ang secrets
Sa creation screen, lalabas ang fields na `sync: false`. Kopyahin ang values mula sa local mo:

```
C:\Users\ChewSun\Desktop\meatlink\backend\.env
```

Buksan sa Notepad, tapos kopyahin ang value ng bawat isa:

| Render field | Linyang kukunin sa .env |
|---|---|
| `SUPABASE_URL` | `SUPABASE_URL=...` |
| `SUPABASE_KEY` | `SUPABASE_KEY=...` |
| `JWT_SECRET` | `JWT_SECRET=...` |
| `VAPID_PUBLIC_KEY` | `VAPID_PUBLIC_KEY=...` |
| `VAPID_PRIVATE_KEY` | `VAPID_PRIVATE_KEY=...` |
| `VAPID_SUBJECT` | `VAPID_SUBJECT=...` |

⚠️ Huwag i-paste ang buong file, at huwag i-share ang values kahit kanino.

Ang `VITE_API_URL` ay **hindi na kailangang galawin** — naka-set na sa `render.yaml` papunta sa backend URL.

### 4. Hintayin ang deploy
- Makikita ang progress sa Dashboard. Mga **5–10 minuto** ang una.
- Pag may ❌, i-click ang service → **Logs** para makita ang error.

### 5. Subukan
Buksan ang frontend URL: **https://meatlink-web.onrender.com**

| Email | Password | Role |
|---|---|---|
| `customer@meatlink.com` | `123456` | buyer |
| `seller@meatlink.com` | `123456` | admin |

Checklist:
- [ ] `/api/health` sa backend URL → `{"ok":true,...,"db":"ok"}`
- [ ] Login at lumabas ang products
- [ ] Cart → pickup/delivery, COD/COP, wholesale discount
- [ ] Admin → Orders, Products, Chat
- [ ] Refresh sa `/orders` at `/admin/orders` (dapat hindi 404 — may SPA rewrite)

---

## Mga importanteng tandaan

- **Free plan:** natutulog ang service pag walang activity ~15 min. Ang unang request pagbalik ay pwede mga 30–60 seconds. Normal lang 'yan; i-refresh lang.
- **Auto-deploy:** sa bawat `git push origin main`, automatic nagre-redeploy ang Render.
- **Env vars:** pag nagbago ng secret sa Render, kailangang **Manual Deploy → Clear build cache & deploy** para mag-apply sa frontend (Vite env vars are baked at build time).
- **Custom domain:** optional, nasa Settings → Custom Domains ng frontend service.

## Troubleshooting

| Sintomas | Gawin |
|---|---|
| `Failed to fetch` sa frontend | Hintayin ang backend; i-check ang Logs ng `meatlink-api`. Siguraduhin ang `VITE_API_URL` ay eksaktong `https://meatlink-api.onrender.com` (walang trailing `/`). |
| `401 / Invalid or expired token` | Mag-log out at mag-login ulit. |
| `Admin only (403)` | I-promote ang user sa Supabase (`role = 'admin'`), tapos mag-login ulit. |
| 404 sa `/orders` pag ni-refresh | I-check ang **Redirects/Rewrites** ng static site: `/*` → `/index.html`. |
| Deploy failed sa `npm install` | I-check ang Logs; siguraduhin ang `NODE_VERSION=22`. |
