# JATcam Bridge

JATcam Bridge is a small local-only server that lets the GitHub Pages PWA use the OneDrive folder already synced to this Windows PC.

## Storage

The bridge auto-detects the personal OneDrive location from Windows environment variables and creates:

```
OneDrive/
└── Apps/
    └── JATcam/
        ├── Originals/
        ├── Edited/
        ├── Exports/
        └── .jatcam/
```

No Microsoft Graph API or Azure/Entra registration is required.

If OneDrive cannot be detected, set:

```powershell
$env:JATCAM_ONEDRIVE_ROOT = "C:\Users\YOURNAME\OneDrive"
```

Or point directly at another library location:

```powershell
$env:JATCAM_LIBRARY_DIR = "D:\Photos\JATcam"
```

## Start

From the repository root:

```powershell
npm run bridge
```

The bridge listens only on:

```
http://127.0.0.1:8765
```

This intentional localhost binding means it is not exposed to the LAN or internet.

## Private phone access with Tailscale

Install Tailscale on the Windows PC and phone and sign both into the same tailnet. Then run:

```powershell
tailscale serve --bg 8765
```

Tailscale returns a private HTTPS address similar to:

```
https://your-pc.your-tailnet.ts.net
```

Enter that HTTPS address in JATcam under **More → JATcam Bridge**.

Use **Tailscale Serve**, not Funnel. Serve is tailnet-only; Funnel would make the service public.

To stop sharing:

```powershell
tailscale serve off
```

## Current bridge API

- `GET /api/health`
- `GET /api/photos`
- `GET /api/file?path=...`
- `POST /api/photos?filename=...`
- `DELETE /api/photos?path=...`

Uploads are streamed directly into `Originals`. The normal OneDrive desktop sync client then handles cloud synchronization.
