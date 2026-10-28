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
| `/admin/documents` | RAG documents, upload, metadata and reindex |
| `/admin/training` | Forecast training and model versions |
| `/admin/monitoring` | System monitoring |
| `/admin/analysis-config` | Analysis configuration |
| `/admin/load-testing` | Development-only load testing |

The hidden tabs navigator mounts each page on its first visit and retains its state when switching pages. This keeps an ongoing training request and its result alive until the admin layout is unmounted, for example on logout or a full browser reload. Monitoring and load-testing polling follow the active route.

The users, categories and RAG pages each fetch only their own list. `src/hooks/use-admin-resource.ts` reloads on focus, aborts list requests on blur or when replaced, and ignores stale responses. RAG mutations refresh only RAG data. The overview intentionally fetches users, categories and documents for its summary cards; the backend does not currently expose a dedicated overview-summary endpoint.

Overview, users and categories live in `src/components/admin/pages/`. Forecast and RAG code have dedicated folders:

```text
src/components/admin/
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

Within RAG, `documents-page.tsx` renders the list and connects the dialogs. `use-rag-documents.ts` owns list/form state and upload, metadata, delete and reindex operations. `rag-document-modals.tsx` groups the upload, metadata, detail and action-menu dialogs, together with their small UI helpers. `rag-operation-dialog.tsx` renders Loading/Success/Error feedback. The grouped dialogs receive the existing controller; they do not create a second hook instance or fetch data themselves.

After changing the route structure, restart the Expo dev server so its generated route types and navigation cache are rebuilt. For static hosting, deploy the complete `dist` directory, including the exported nested admin routes.
