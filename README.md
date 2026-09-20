# JATcam — Phase 1 UI Vertical Slice

Private, mobile-first photography PWA designed around the approved JATcam brand standard.

## Included
- Responsive desktop + mobile application shell
- Branded Home/Library photo grid
- Albums view
- Upload flow with demo progress
- Search/filter view with map placeholder
- Photo detail modal with EXIF-style metadata
- Favorites and More views
- PWA manifest + service worker
- `OneDriveAdapter` boundary ready for Microsoft Graph wiring

## Run locally
Because the app uses ES modules and a service worker, serve it over HTTP rather than opening `index.html` directly.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` from this folder.

## Phase 2 — Local Bridge
JATcam currently uses a local Windows bridge instead of Microsoft Graph.

1. The bridge writes directly into the existing local OneDrive sync folder.
2. OneDrive's normal Windows sync client handles cloud backup.
3. Tailscale Serve provides a private HTTPS path from the PWA/phone to the PC.
4. No Azure subscription, Entra app registration, or Microsoft Graph credentials are required.
5. Direct Microsoft Graph support remains parked as a future option.

See [bridge/README.md](bridge/README.md) for setup and usage.
