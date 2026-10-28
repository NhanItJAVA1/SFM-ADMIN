# SFM Admin Web

Admin dashboard web app separated from the mobile client. It uses the same backend API and carries over the admin workspaces for user management, default categories, RAG documents, forecasting, monitoring, analysis configuration, and development load testing.

## Run locally

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the backend API root (for example `https://your-api.example.com/api`).
2. Install dependencies with `npm install`.
3. Start the web app with `npm run web`.

The web app is intended to be served over HTTPS in production. API authorization and admin role checks must remain enabled on the backend.
