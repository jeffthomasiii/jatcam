import { photos as demoPhotos } from "./data.js";
import { initializeAuth, signIn, signOut } from "./auth.js";
import {
  ensureAppFolder,
  listOriginalPhotos,
  uploadFileResumable
} from "./graph.js";

function photoType(name = "") {
  const ext = name.split(".").pop()?.toUpperCase() || "";
  return ext === "CR2" ? "RAW" : ext || "FILE";
}

function graphItemToPhoto(item) {
  const photo = item.photo || {};
  const thumb =
    item.thumbnails?.[0]?.large?.url ||
    item.thumbnails?.[0]?.medium?.url ||
    item.thumbnails?.[0]?.small?.url ||
    "";

  const camera =
    [photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ") ||
    "Unknown camera";

  const shutter =
    photo.exposureNumerator && photo.exposureDenominator
      ? `${photo.exposureNumerator}/${photo.exposureDenominator} s`
      : "—";

  return {
    id: item.id,
    src: thumb,
    title: item.name.replace(/\.[^.]+$/, ""),
    album: "Originals",
    favorite: false,
    rating: 0,
    camera,
    lens: "—",
    shutter,
    aperture: photo.fNumber ? `f/${photo.fNumber}` : "—",
    iso: photo.iso ? String(photo.iso) : "—",
    focal: photo.focalLength ? `${photo.focalLength} mm` : "—",
    file: item.name,
    type: photoType(item.name),
    tags: [],
    date: photo.takenDateTime || item.createdDateTime || "",
    location: "",
    webUrl: item.webUrl,
    size: item.size
  };
}

export const OneDriveAdapter = {
  async initialize() {
    return initializeAuth();
  },

  async signIn() {
    return signIn();
  },

  async signOut() {
    return signOut();
  },

  async bootstrap() {
    return ensureAppFolder();
  },

  async listPhotos() {
    const auth = await initializeAuth();
    if (!auth.configured || !auth.account) return demoPhotos;

    await ensureAppFolder();
    const items = await listOriginalPhotos();
    return items.map(graphItemToPhoto);
  },

  async uploadFiles(files, onProgress = () => {}) {
    const auth = await initializeAuth();

    if (!auth.configured || !auth.account) {
      let complete = 0;
      for (const file of files) {
        await new Promise(resolve => setTimeout(resolve, 220));
        complete += 1;
        onProgress({ complete, total: files.length, name: file.name });
      }
      return { uploaded: files.length, mode: "demo" };
    }

    await ensureAppFolder();

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      await uploadFileResumable(file, progress => {
        onProgress({
          complete: i + progress.percent,
          total: files.length,
          name: file.name
        });
      });
    }

    return { uploaded: files.length, mode: "onedrive" };
  }
};
