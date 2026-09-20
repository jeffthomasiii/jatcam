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

## Phase 2
1. Microsoft Entra app registration
2. MSAL browser authentication
3. `Files.ReadWrite.AppFolder`
4. OneDrive `/Apps/JATcam` bootstrap
5. Real photo listing, thumbnail retrieval and resumable uploads
6. JSON metadata store for ratings/tags/albums
