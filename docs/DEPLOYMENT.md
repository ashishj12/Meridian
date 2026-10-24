# Deployment

## Default container

`docker compose up --build` installs locked dependencies, typechecks/builds the client and starts the Node API with persistent SQLite storage. The healthcheck calls `/api/health`. The application and API share an origin; no separate static-only deployment can supply the connected demo.

Use Node 24 with a writable local database directory. For a hosted instance configure HTTPS, a persistent volume mounted at `/app/data`, and:

```dotenv
PORT=3001
DB_PATH=/app/data/meridian.sqlite
PUBLIC_BASE_URL=https://YOUR-REVIEW-DOMAIN
FLIGHT_SOURCE=mock-aidx
AI_PROVIDER=offline-template
```

Set the public URL only to a domain actually reachable by reviewers and phones. On a LAN, use your computer's LAN IP and allow the application port through the local firewall. `localhost` on a phone points to the phone itself.

## Process topology

One process is the default. Several processes on the same host may share the same **local** SQLite database file. Transactions serialize writes, a renewable lease elects one clock owner and `data_version` polling synchronizes process caches/SSE clients. Use different listener ports behind a reverse proxy. Do not copy the database into independent containers and expect synchronization.

Cross-host horizontal deployment needs a server database and shared pub/sub/clock coordination; it is outside this local SQLite topology. Do not mount the database over a network filesystem. Back up with SQLite's backup API or a consistent snapshot while writes are stopped, rather than copying an active WAL database incompletely.

## Reverse proxy and lifecycle

Forward `/api/events` without buffering and allow long-lived SSE connections. Preserve normal cache-control headers. Serve frontend/API from the same origin. Graceful SIGINT/SIGTERM shutdown stops vendor work, closes SSE streams, releases the clock lease and closes the database/listener.

The challenge intentionally has no login, authorization system or payments. Keep its synthetic demonstration behind an appropriate deployment perimeter if exposing administrative mutation endpoints. Credentials belong in environment variables; never put them in frontend code or ZIPs.

## Acceptance still requiring an external environment

No public hosting account/domain is configured and no public URL is verified. After provisioning a host:

1. Verify HTTPS UI, API health, persisted state and SSE from an external network.
2. Run the delay → decision → QR → claim → redemption flow.
3. Scan with a physical phone and confirm the encoded URL is reachable.
4. Restart and verify data persistence and lease takeover if running multiple processes.
5. Run the browser suite with `E2E_BASE_URL` set to the hosted URL.

Local tests do not substitute for those hosted/device checks or for vendor certification.
