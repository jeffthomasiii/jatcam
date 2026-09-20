import { getAccessToken } from "./auth.js";

const GRAPH = "https://graph.microsoft.com/v1.0";

export async function graphFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("Microsoft sign-in is required.");

  const response = await fetch(
    path.startsWith("https://") ? path : `${GRAPH}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body instanceof Blob ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Microsoft Graph ${response.status}: ${text || response.statusText}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function ensureAppFolder() {
  const root = await graphFetch("/me/drive/special/approot");
  const children = await graphFetch("/me/drive/special/approot/children");
  const names = new Set((children.value || []).map(item => item.name));

  for (const name of ["Originals", "Edited", "Exports", ".jatcam"]) {
    if (names.has(name)) continue;
    await graphFetch("/me/drive/special/approot/children", {
      method: "POST",
      body: JSON.stringify({
        name,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail"
      })
    });
  }

  return root;
}

export async function listOriginalPhotos() {
  const params = new URLSearchParams({
    "$expand": "thumbnails",
    "$select": "id,name,size,photo,image,file,createdDateTime,lastModifiedDateTime,webUrl,thumbnails"
  });

  const result = await graphFetch(
    `/me/drive/special/approot:/Originals:/children?${params.toString()}`
  );

  return (result.value || []).filter(item => item.file || item.image || item.photo);
}

export async function createUploadSession(file) {
  const safeName = encodeURIComponent(file.name);
  return graphFetch(
    `/me/drive/special/approot:/Originals/${safeName}:/createUploadSession`,
    {
      method: "POST",
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "rename",
          name: file.name
        }
      })
    }
  );
}

export async function uploadFileResumable(file, onProgress = () => {}) {
  const session = await createUploadSession(file);
  const chunkSize = 10 * 1024 * 1024;
  let start = 0;
  let lastResponse = null;

  while (start < file.size) {
    const endExclusive = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, endExclusive);
    const endInclusive = endExclusive - 1;

    const response = await fetch(session.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.size),
        "Content-Range": `bytes ${start}-${endInclusive}/${file.size}`
      },
      body: chunk
    });

    if (!response.ok && response.status !== 202) {
      const text = await response.text();
      throw new Error(`OneDrive upload failed (${response.status}): ${text || response.statusText}`);
    }

    lastResponse = await response.json();
    start = endExclusive;
    onProgress({
      loaded: start,
      total: file.size,
      percent: file.size ? start / file.size : 1
    });
  }

  return lastResponse;
}
