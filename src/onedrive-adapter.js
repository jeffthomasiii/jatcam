/**
 * Storage boundary for JATcam.
 * UI code only calls this adapter. Microsoft Graph will replace the mock
 * implementations in Phase 2 without forcing UI rewrites.
 */
export const OneDriveAdapter = {
  async signIn() {
    return { id: 'local-demo', displayName: 'JAT', mode: 'demo' };
  },
  async listPhotos() {
    const { photos } = await import('./data.js');
    return photos;
  },
  async uploadFiles(files, onProgress = () => {}) {
    let complete = 0;
    for (const file of files) {
      await new Promise(r => setTimeout(r, 220));
      complete += 1;
      onProgress({ complete, total: files.length, name: file.name });
    }
    return { uploaded: files.length };
  }
};
