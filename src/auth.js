import {
  PublicClientApplication,
  InteractionRequiredAuthError
} from "@azure/msal-browser";
import { JATCAM_CONFIG, isMicrosoftConfigured } from "./config.js";

let client;
let initialized = false;

function buildMsalConfig() {
  return {
    auth: {
      clientId: JATCAM_CONFIG.clientId,
      authority: JATCAM_CONFIG.authority,
      redirectUri: JATCAM_CONFIG.redirectUri,
      postLogoutRedirectUri: JATCAM_CONFIG.redirectUri
    },
    cache: {
      cacheLocation: "localStorage"
    }
  };
}

export async function initializeAuth() {
  if (!isMicrosoftConfigured()) {
    return { configured: false, account: null };
  }

  if (!client) {
    client = new PublicClientApplication(buildMsalConfig());
  }

  if (!initialized) {
    await client.initialize();
    const redirectResult = await client.handleRedirectPromise();
    const account =
      redirectResult?.account ??
      client.getActiveAccount() ??
      client.getAllAccounts()[0] ??
      null;

    if (account) client.setActiveAccount(account);
    initialized = true;
  }

  return {
    configured: true,
    account: client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null
  };
}

export async function signIn() {
  await initializeAuth();
  return client.loginRedirect({
    scopes: JATCAM_CONFIG.graphScopes
  });
}

export async function signOut() {
  await initializeAuth();
  const account = client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null;
  return client.logoutRedirect({
    account,
    postLogoutRedirectUri: JATCAM_CONFIG.redirectUri
  });
}

export async function getAccessToken() {
  const { configured, account } = await initializeAuth();
  if (!configured || !account) return null;

  try {
    const result = await client.acquireTokenSilent({
      account,
      scopes: JATCAM_CONFIG.graphScopes
    });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await client.acquireTokenRedirect({
        account,
        scopes: JATCAM_CONFIG.graphScopes
      });
      return null;
    }
    throw error;
  }
}
