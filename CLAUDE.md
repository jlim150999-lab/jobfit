# JobFit — Project Context

## What this is
A personal job board web app that pulls live listings from multiple sources and scores each role against Nellie's profile (0–100 fit score). Single-file front-end (`index.html`) with serverless API proxy functions for CORS.

**Live app:** https://jobfit-steel.vercel.app  
**GitHub:** https://github.com/jlim150999-lab/jobfit  
**Deploy:** `git add index.html && git commit -m "..." && git push` → Vercel auto-deploys in ~30 sec

---

## Nellie's profile (used for fit scoring)

- **Current role:** Product Marketing Analyst at UPS Supply Chain Solutions (Oct 2024–present)
- **Experience:** ~2 years full-time + 2× 6-month internships (Amazon Global Selling, Unilever SEAA)
- **Notice:** Serving notice until 29 May 2026, free to start immediately after
- **Target roles:** Marketing Specialist, Growth Strategy Associate, Strategy & Ops Executive
- **Target industries:** Tech, SaaS, eCommerce, fintech, FMCG — high-growth environments
- **Salary target:** SGD $4.8K–5K/month (current pay $4.2K, want ≥15% increment)
- **Hard deal-breakers:** Pure execution/admin roles, logistics/supply chain/heavy industry, East/North/North-East Singapore offices

**Core skills:** SQL, Excel (Pivot, Power Query), Power BI, Domo, Adobe Analytics, data visualisation, funnel analysis, A/B testing, B2B marketing, demand generation, Pardot, campaign execution, stakeholder management, market research, competitive analysis, go-to-market strategy, cross-functional collaboration

**Design preferences:** Warm minimal aesthetic, Aptos font, burnt orange accent (#C4601E), warm beige background (#FAF7F4)

---

## Architecture

```
index.html          — entire front-end (UI + scoring logic + fetch calls)
api/
  mcf.js            — serverless proxy → MyCareersFuture API (bypasses CORS)
  jsearch.js        — serverless proxy → JSearch/RapidAPI (Google Jobs aggregator)
  adzuna.js         — serverless proxy → Adzuna SG
vercel.json         — routing config
```

**API sources (all live):**
| Source | What it covers | Keys |
|--------|---------------|------|
| MyCareersFuture | Singapore govt job portal | None (public API via proxy) |
| The Muse | International, marketing roles | None (public API) |
| Remotive | Remote-only roles | None (public API) |
| JSearch (RapidAPI) | Google Jobs / LinkedIn / Indeed aggregator | Vercel env var `JSEARCH_KEY` |
| Adzuna SG | Singapore-specific aggregator | Vercel env vars `ADZUNA_APP_ID`, `ADZUNA_KEY` |

API keys are in Vercel environment variables — not in source code.

---

## UI Layout (as of May 2026)

**LinkedIn-style split pane:**
- **Left pane** (390px): scrollable list of compact job cards — title, company, fit badge, location/type tags
- **Right pane** (flex): detail panel showing full JD, fit score breakdown, skills, CTA button
- Clicking a card → right pane populates; active card gets orange left border
- Mobile (≤768px): stacks vertically; tap card → right pane slides in; "← Back to list" returns

**Header:** search box + location input + two chip rows (category filter + industry filter)

---

## Fit scoring logic (`calculateFit()` in index.html)

| Signal | Points |
|--------|--------|
| Skill match (denominator 8) | 0–55 |
| Title alignment | 15 (hit) / 0 (miss) |
| Experience match (≤2 yrs) | 10 |
| Experience match (≤4 yrs) | 6 |
| Experience match (≤6 yrs) | 2 |
| Experience unknown (default) | 5 |
| Boost keywords (tech/SaaS/FMCG/data-driven/APAC) | up to +15 |
| Seniority penalty (Senior/Manager/Director/VP/Lead) | −15 |
| C-suite penalty (CMO/CTO/COO/Chief) | −25 |
| Execution-heavy penalty (2+ admin signals, zero strategy) | −10 |
| Salary in range ($4.5K–$5.5K) | +5 |
| Salary too low (<$4K) | −10 |
| Salary overleveled (>$7K) | −5 |
| Location penalty — East/North/North-East SG | −10 |
| Deal-breaker industry (logistics/supply chain etc.) | −25 |

Score clamped to 5–100. Colour: 🟢 ≥70 · 🟡 40–69 · 🔴 <40

**Score breakdown** is stored in `job._fit.breakdown` and shown:
- On hover over the fit badge in the left-pane card (dark tooltip)
- Always visible in the detail panel below matched skills

**Location penalty areas** (checks `job.location` then scans description for "based in / office in" phrases):
- East: Tampines, Bedok, Changi, Pasir Ris, Paya Lebar, Katong, Marine Parade, Geylang, Ubi, Eunos, Simei, Loyang, Expo
- North: Woodlands, Yishun, Sembawang, Admiralty, Mandai, Canberra
- North-East: Sengkang, Punggol, Hougang, Serangoon, Buangkok, Kovan, Ang Mo Kio

---

## Filters

**Category chips:** All · Remote · Ops · Strategy · Analytics  
**Industry chips:** All Industries · Tech/SaaS · FMCG · Finance/Fintech · eCommerce · Healthcare · Others

Both chip rows use AND logic — selecting one from each narrows the list further.

**Industry detection uses specific keywords only** (not generic terms like "digital", "tech", "app"):
- Tech/SaaS: `saas`, `software`, `cloud`, `startup`, `software company`, `tech company` etc.
- FMCG: `fmcg`, `consumer goods`, `cpg`, `unilever`, `nestle` etc.
- Finance: `fintech`, `financial services`, `banking`, `asset management` etc.
- eCommerce: `ecommerce`, `shopee`, `lazada`, `grab`, `marketplace` etc.
- Healthcare: `healthcare`, `medical`, `pharmaceutical`, `biotech`, `clinic` etc.

---

## Data processing

- `stripHtml()` converts block-level HTML (`<p>`, `<li>`, `<br>`, `<div>` etc.) to `\n` before stripping — preserves JD paragraph/bullet structure in the detail panel
- Intern/trainee postings are excluded before scoring (`/\b(intern|internship|trainee)\b/i` on title + description)
- Deduplication by `title + company` before scoring

---

## What was last worked on
Major UI overhaul (May 22 2026):
- LinkedIn-style split-pane layout
- Industry filter chips
- Intern exclusion
- Scoring refinement (less bunching at top)
- Score breakdown tooltip on hover
- JD formatting fix (preserves paragraphs/bullets)
- Industry filter keyword tightening

## Potential next features (discussed but not built)
- Save / bookmark jobs (localStorage)
- "Applied" tracker
- Date posted filter (last 7 / 30 days)
- Salary range display + filter
- Export visible jobs to CSV
- Company logo fetching
