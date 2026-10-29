# SFM Admin Web

Admin dashboard web app separated from the mobile client. It uses the same backend API and carries over the admin workspaces for user management, default categories, RAG documents, forecasting, monitoring, analysis configuration, and development load testing.

## Run locally

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the backend API root (for example `https://your-api.example.com/api`).
2. Install dependencies with `npm install`.
3. Start the web app with `npm run web`.

The web app is intended to be served over HTTPS in production. API authorization and admin role checks must remain enabled on the backend.

## Admin routes

`app/admin/_layout.tsx` owns the shared sidebar, authentication/role guard, fonts and logout. Each feature has its own route and page module:

| URL | Feature |
| --- | --- |
| `/admin` | Overview |
| `/admin/users` | Users, filters, pagination and detail |
| `/admin/categories` | Default categories |
| `/admin/documents` | RAG documents, upload, metadata, reindex and delete |
| `/admin/training` | Forecast training and model versions |
| `/admin/monitoring` | System monitoring |
| `/admin/analysis-config` | Analysis configuration |
| `/admin/load-testing` | Development-only load testing |

The hidden tabs navigator mounts each page on its first visit and retains its state when switching pages. This keeps an ongoing training request and its result alive until the admin layout is unmounted, for example on logout or a full browser reload. Monitoring and load-testing polling follow the active route.

The users, categories and RAG pages each fetch only their own list. `src/hooks/use-admin-resource.ts` reloads on focus, aborts list requests on blur or when replaced, and ignores stale responses. RAG mutations refresh only RAG data. The overview intentionally fetches users, categories and documents for its summary cards; the backend does not currently expose a dedicated overview-summary endpoint.

Overview, users and categories live in `src/components/admin/pages/`. Forecast, RAG and analysis code have dedicated folders:

```text
src/components/admin/
  analysis/
    analysis-config-workspace.tsx
    analysis-config-history.tsx
    vnd-amount-input.tsx
    health/
      health-threshold-controls.tsx
    anomaly/
      anomaly-preview-dataset.tsx
      anomaly-preview-result.tsx
      anomaly-reason-guide.tsx
      anomaly-reasons.ts
  forecast/
    forecast-training-workspace.tsx
    forecast-training-result.tsx
    forecast-model-versions.tsx
    training-users.ts
    training-result-summary.ts
  rag/
    documents-page.tsx
    use-rag-documents.ts
    rag-document-modals.tsx
    rag-operation-dialog.tsx
```

`app/admin/training.tsx` and `app/admin/documents.tsx` are the route entry points. Shared presentation helpers/styles remain directly under `src/components/admin/`. Old `/admin?view=documents` links redirect to the corresponding new route; `/admin/users?userId=123` opens a user from the overview.

`app/admin/analysis-config.tsx` opens `analysis/analysis-config-workspace.tsx`. Health and Anomaly have separate subfolders. Configuration history and the VND input are shared by both tabs and remain directly under `analysis/`. Anomaly's Reason helpers live with its components in `analysis/anomaly/anomaly-reasons.ts`.

Within RAG, `documents-page.tsx` renders the list and connects the dialogs. `use-rag-documents.ts` owns list/form state and upload, metadata, delete and reindex operations. `rag-document-modals.tsx` groups the upload, metadata, detail and action-menu dialogs, together with their small UI helpers. `rag-operation-dialog.tsx` renders Loading/Success/Error feedback. The grouped dialogs receive the existing controller; they do not create a second hook instance or fetch data themselves.

The RAG page uses a desktop table with accent-insensitive search, category/status filters, sorting and pagination (10, 20 or 50 documents per page). These controls operate on the loaded list without extra API requests; pagination does not reduce the initial list response. Status filters appear once, above the list. The table fits its panel; panels narrower than 900 px use document cards rather than horizontal scrolling. Upload, metadata, detail and delete dialogs are centered on desktop and use bottom sheets on small screens. The table and select controls use native browser elements, as this admin app targets the web.

After changing the route structure, restart the Expo dev server so its generated route types and navigation cache are rebuilt. For static hosting, deploy the complete `dist` directory, including the exported nested admin routes.

The Anomaly preview loads its baseline and scoring policy from `GET /v1/admin/analysis-config/preview-data`, forwarded by BE to AI. The AI router uses the same expense generator for the displayed reference and scoring. `anomaly-preview-dataset.tsx` displays the baseline as a chart, statistics and expandable table. `anomaly-preview-result.tsx` shows the assessment of only the editable expense: normal, confirmed anomaly, needs review, or insufficient reference. The form waits for this baseline before allowing a preview; loading is cancelled on blur and reused during the page session. The chart's overall median is descriptive; the comparison for the editable expense uses its own category. Restart BE and AI after the contract changes.

The baseline spans 49 days with daily food expenses (70,000–100,000 VND), weekly travel expenses (100,000–200,000 VND) and irregular shopping expenses. Counts and ranges come from AI. A local random seed keeps amounts repeatable. The editable shopping expense is on the following day. Chart positions use calendar dates, so transactions on the same date align and gaps retain their actual duration.

Anomaly scoring uses category-relative log amount and robust Z. Reference data excludes the candidate day and future dates. Under 5 category samples produces insufficient history; 5–19 samples permits only low-confidence review; from 20 samples a material category deviation plus model agreement can produce a confirmed alert. These are initial policy values to validate against labeled cases, not statistical guarantees. Missing/zero-MAD category profiles are not replaced by the overall spending profile. The Reason guide reads policy thresholds from AI and distinguishes evidence, confidence and insufficient-data reasons. BE retains assessment metadata and sends older `anomaly_history` separately, preserving the existing Health and Forecast inputs.
