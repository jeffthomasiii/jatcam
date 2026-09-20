export const JATCAM_CONFIG = {
  clientId: "REPLACE_WITH_ENTRA_APPLICATION_CLIENT_ID",
  authority: "https://login.microsoftonline.com/consumers",
  redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
  graphScopes: ["Files.ReadWrite.AppFolder"]
};

export function isMicrosoftConfigured() {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(JATCAM_CONFIG.clientId);
}
