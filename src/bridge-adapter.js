import { photos as demoPhotos } from "./data.js";

const KEY = "jatcam.bridge.url";

const rawPlaceholder = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#e7e4dd"/><path d="M180 210h240v180H180z" fill="none" stroke="#556b46" stroke-width="12"/><circle cx="300" cy="300" r="62" fill="none" stroke="#556b46" stroke-width="12"/><text x="300" y="470" text-anchor="middle" font-family="Arial" font-size="34" fill="#2f4a32">RAW</text></svg>'
)}`;

function normalizeUrl(value = "") {
  return value.trim().replace(/\/+$/, "");
}

export function getBridgeUrl() {
  return normalizeUrl(localStorage.getItem(KEY) || "");
}

export function saveBridgeUrl(value) {
  const normalized = normalizeUrl(value);
  if (normalized) localStorage.setItem(KEY, normalized);
  else localStorage.removeItem(KEY);
  return normalized;
}

async function bridgeFetch(path, options = {}) {
  const base = getBridgeUrl();
  if (!base) throw new Error("JATcam Bridge is not configured.");

  const response = await fetch(`${base}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Bridge request failed (${response.status})`);
  }
  return response;
}

function bridgePhoto(item, base) {
  const preview = item.previewPath
    ? `${base}/api/file?path=${encodeURIComponent(item.previewPath)}`
    : rawPlaceholder;

  return {
    id: item.id,
    src: preview,
    title: item.name.replace(/\.[^.]+$/, ""),
    album: "Originals",
    favorite: false,
    rating: 0,
    camera: "Metadata pending",
    lens: "—",
    shutter: "—",
    aperture: "—",
    iso: "—",
    focal: "—",
    file: item.name,
    type: item.type,
    tags: [],
    date: new Date(item.modified).toLocaleString(),
    location: "",
    bridgePath: item.path,
    size: item.size
  };
}

export const BridgeAdapter = {
  getUrl: getBridgeUrl,
  saveUrl: saveBridgeUrl,

  async initialize() {
    const base = getBridgeUrl();
    if (!base) {
      return { configured: false, connected: false, mode: "demo" };
    }

    try {
      const response = await bridgeFetch("/api/health");
      const health = await response.json();
      return { configured: true, connected: true, mode: "bridge", health };
    } catch (error) {
      return { configured: true, connected: false, mode: "demo", error: error.message };
    }
  },

  async listPhotos() {
    const base = getBridgeUrl();
    if (!base) return demoPhotos;

    try {
      const response = await bridgeFetch("/api/photos");
      const body = await response.json();
      return (body.value || []).map(item => bridgePhoto(item, base));
    } catch {
      return demoPhotos;
    }
  },

  async uploadFiles(files, onProgress = () => {}) {
    const base = getBridgeUrl();

    if (!base) {
      let complete = 0;
      for (const file of files) {
        await new Promise(resolve => setTimeout(resolve, 220));
        complete += 1;
        onProgress({ complete, total: files.length, name: file.name });
      }
      return { uploaded: files.length, mode: "demo" };
    }

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const response = await bridgeFetch(
        `/api/photos?filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file
        }
      );
      await response.json();
      onProgress({ complete: i + 1, total: files.length, name: file.name });
    }

    return { uploaded: files.length, mode: "bridge" };
  },

  async deletePhoto(photo) {
    if (!photo?.bridgePath) throw new Error("This photo is not stored by the bridge.");
    const response = await bridgeFetch(
      `/api/photos?path=${encodeURIComponent(photo.bridgePath)}`,
      { method: "DELETE" }
    );
    return response.json();
  }
};
