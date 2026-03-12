# KisanMitra — Farm Intelligence Platform

A personal farm intelligence platform for small-scale farmers in **Bhavere village, Nashik district, Maharashtra**. It delivers real-time, actionable decision support for weather, crop scheduling, disease risk, and market prices — all in a mobile-first progressive web app.

---

## What it does

KisanMitra combines live weather forecasts, government commodity price data, and AI-powered advisory into a single dashboard designed for farmers who need clear, timely answers:

- **10-day weather forecast** with spray-window analysis (rain, wind, humidity)
- **Disease risk assessment** per crop based on live weather conditions
- **Market price intelligence** — live commodity prices from [data.gov.in](https://data.gov.in) for Nashik and Lasalgaon mandis
- **Sell signal engine** — recommends SELL NOW / HOLD / WAIT / FORCED SELL based on price trends, 90-day averages, and seasonal context
- **AI advisory** — hybrid model: Claude Haiku when available, deterministic Smart Advisor as fallback (works offline)
- **WhatsApp report** — one-tap shareable advisory summary
- **Telegram alerts** — daily automated price and weather alerts via bot
- **Browser notifications** — smart cooldowns prevent alert fatigue

**Target crops:** Banana · Tomato · Bitter Gourd · Papaya · Onion  
**Target mandis:** Nashik · Lasalgaon  
**Farm coordinates:** 19.78°N, 73.91°E

---

## Technology stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5 |
| UI | shadcn/ui (Radix UI), Tailwind CSS 3, Lucide icons |
| State | TanStack Query 5, localStorage |
| Charts | Recharts 2 |
| Forms | React Hook Form 7, Zod |
| Backend | Supabase (PostgreSQL + Deno Edge Functions) |
| Weather API | Open-Meteo (free, no auth) |
| Price API | data.gov.in (DATAGOV_API_KEY) with Agmarknet HTML scrape fallback |
| AI | Anthropic Claude Haiku (ANTHROPIC_API_KEY) |
| Notifications | Telegram Bot API + Web Notification API |
| PWA | vite-plugin-pwa |

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                 │
│                                                         │
│  Pages: Dashboard · Research · Market · Settings · Import│
│  Hooks: useWeather · usePrices · usePriceHistory        │
│  Lib:   advisoryEngine · trendEngine · smartAdvisor     │
│         cronManager · notificationManager · reportGen   │
└──────────────────────┬──────────────────────────────────┘
                       │ Supabase JS Client
┌──────────────────────▼──────────────────────────────────┐
│                  Supabase Backend                        │
│                                                         │
│  Edge Functions (Deno):                                 │
│    daily-price-cron   fetch-mandi-prices                │
│    fetch-all-prices   seed-historical-prices            │
│    ai-advisor         send-telegram-report              │
│    check-secrets      seed-all-historical               │
│                                                         │
│  PostgreSQL Tables:                                     │
│    daily_prices · weather_cache · report_history        │
│    sowing_intel · ai_advice_cache                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│               External APIs                             │
│  data.gov.in · Open-Meteo · Anthropic · Telegram        │
└─────────────────────────────────────────────────────────┘
```

### Key design decisions

**Hybrid AI (fallback-first):** The `ai-advisor` edge function calls Claude Haiku but, if the API key is missing or the call fails, falls back to `smartAdvisor.ts` — a fully deterministic rule-based engine. This means advisory intelligence is always available, even offline.

**Multi-source price fetching:** Prices cascade through: `data.gov.in → Agmarknet HTML scrape → cached DB values`. Each price is validated against commodity-specific min/max ranges (e.g. Tomato ₹200–8,000/qtl) and tagged with its source.

**Client-side daily cron:** `cronManager.ts` triggers `fetch-all-prices` once per day on app load (IST timezone-aware, tracked via localStorage). No server scheduler is required.

**Alert thresholds (configurable):** Crash threshold (default −30%), spike threshold (default +20%), YELLOW warning at half crash threshold. Users can adjust these in Settings.

**Sell signal logic:**

| Alert Level | Season | Signal |
|-------------|--------|--------|
| GREEN | HIGH or NEUTRAL | SELL NOW |
| RED | LOW | FORCED SELL |
| RED | HIGH or NEUTRAL | WAIT (should recover) |
| YELLOW | any | WAIT (softening) |
| NORMAL | HIGH | SELL NOW |
| NORMAL | LOW/NEUTRAL | HOLD |

Sowing intel adjustments: high reported sowing area (>+20%) overrides SELL NOW → HOLD; low sowing area (<−20%) overrides HOLD → SELL NOW.

---

## Getting started (local development)

### Prerequisites

- Node.js ≥ 18 and npm, **or** Bun
- A [Supabase](https://supabase.com) project with the database migrations applied (see `supabase/migrations/`). Apply them with the [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase db push`, or run each `.sql` file in order via the Supabase Dashboard SQL editor.
- (Optional) API keys for data.gov.in, Anthropic Claude, and Telegram Bot

### Setup

```sh
# Clone the repo
git clone https://github.com/dhruveshgjr/farm-sense-bhavere
cd farm-sense-bhavere

# Install dependencies
npm install        # or: bun install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start the dev server
npm run dev        # or: bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |

### Supabase edge function secrets

Set these in your Supabase project dashboard (Settings → Edge Functions → Secrets):

| Secret | Required | Description |
|--------|----------|-------------|
| `DATAGOV_API_KEY` | Recommended | data.gov.in API key for commodity prices |
| `ANTHROPIC_API_KEY` | Optional | Enables Claude Haiku AI advisory |
| `TELEGRAM_BOT_TOKEN` | Optional | Enables Telegram alert delivery |
| `TELEGRAM_CHAT_ID` | Optional | Target Telegram chat/channel ID |

Without `ANTHROPIC_API_KEY` the app falls back to the deterministic Smart Advisor. Without `DATAGOV_API_KEY` it attempts the public fallback key before scraping Agmarknet.

---

## Project structure

```
src/
├── pages/               # Route-level page components
│   ├── Index.tsx          # Dashboard (main hub)
│   ├── ResearchPage.tsx   # Research desk (3-column detail view)
│   ├── MarketPage.tsx     # Price history & volatility charts
│   ├── SettingsPage.tsx   # Farm config, thresholds, data management
│   ├── DataImportPage.tsx # Bulk price import
│   └── ReportPrint.tsx    # Printable advisory report
├── components/
│   ├── dashboard/         # 14 dashboard sub-sections
│   └── ui/                # shadcn/ui component library (79 files)
├── hooks/                 # useWeather, usePrices, usePriceHistory, useFetchPrices
├── lib/                   # Business logic
│   ├── advisoryEngine.ts    # Spray windows, disease risk, weather alerts
│   ├── trendEngine.ts       # Price alerts, sell signals, volatility, arrival trends
│   ├── smartAdvisor.ts      # Deterministic AI fallback
│   ├── farmConfig.ts        # Crop/mandi config, price ranges, weather codes
│   ├── reportGenerator.ts   # WhatsApp-formatted report builder
│   ├── cronManager.ts       # Client-side daily fetch trigger
│   ├── notificationManager.ts # Browser notification cooldowns
│   └── settingsStore.ts     # localStorage settings persistence
└── integrations/supabase/  # Supabase client + generated types

supabase/
├── functions/           # 8 Deno edge functions
└── migrations/          # 6 SQL migration files
```

---

## Database schema

| Table | Purpose |
|-------|---------|
| `daily_prices` | Price history (commodity × mandi × date, source-tagged) |
| `weather_cache` | 10-day forecast cache (refreshed every 3 hours) |
| `report_history` | Fetch logs and alert records |
| `sowing_intel` | Farmer-reported sowing area vs last year |
| `ai_advice_cache` | Claude AI responses cached by data hash |

Key stored function: `get_price_stats(commodity, mandi)` → returns avg_30d, avg_90d, current_price, volatility_score.

---

## Strategic roadmap

### Completed (MVP)
- [x] Weather forecast with spray-window and disease-risk analysis
- [x] Live price fetching from data.gov.in (multi-source, validated)
- [x] Sell signal engine (price trend + seasonal context + sowing intel)
- [x] Hybrid AI advisor (Claude + deterministic fallback)
- [x] WhatsApp shareable report
- [x] Telegram daily alert bot
- [x] Browser push notifications with smart cooldowns
- [x] PWA (installable, offline banner)
- [x] Settings page (crop/mandi toggles, alert thresholds)
- [x] Market history charts (price trends, volatility, arrivals, CSV export)
- [x] Bulk price import via paste
- [x] Onboarding wizard

### Near-term improvements
- [ ] Wire sowing intel into sell signal predictions — `getSellSignal()` in `trendEngine.ts` already accepts an optional `sowingPct` parameter and contains the override logic, but no calling component passes sowing data from the `sowing_intel` table yet
- [ ] Smart AI advice cache invalidation (currently naive, invalidates on data hash only)
- [ ] Strengthen Agmarknet HTML scrape (fragile against page structure changes)
- [ ] Expand history page with year-on-year overlays

### Future scope
- [ ] User authentication + multi-farm support (currently hardcoded to Bhavere)
- [ ] RAG knowledge base (`_rag_documents` table schema exists; not yet wired)
- [ ] Yield prediction and cost-benefit calculator
- [ ] SMS alerts (currently browser notifications + Telegram only)
- [ ] Historical advisory accuracy tracking
- [ ] True offline-first PWA (background sync for price fetch)

---

## Deployment

The app is designed for deployment on [Lovable](https://lovable.dev) (frontend hosting + Supabase backend). Any static host (Netlify, Vercel, Cloudflare Pages) can serve the Vite build; the edge functions run on Supabase.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in your hosting provider.
