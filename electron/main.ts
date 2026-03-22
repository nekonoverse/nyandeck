import { app, BrowserWindow, ipcMain, protocol, net } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// --- Config management ---

interface OAuthConfig {
  client_id: string;
  client_secret: string;
  access_token: string | null;
}

interface AppConfig {
  serverUrl?: string;
  oauth?: Record<string, OAuthConfig>;
}

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

function loadConfig(): AppConfig {
  try {
    return JSON.parse(fs.readFileSync(getConfigPath(), "utf-8"));
  } catch {
    return {};
  }
}

function saveConfig(config: AppConfig): void {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

// --- Server URL configuration ---
// Priority: CLI arg > env var > config file > default
function getServerUrl(): string {
  const serverArg = process.argv.find((a) => a.startsWith("--server-url="));
  if (serverArg) return serverArg.split("=").slice(1).join("=");

  if (process.env.NYANDECK_SERVER_URL) return process.env.NYANDECK_SERVER_URL;

  const config = loadConfig();
  if (config.serverUrl) return config.serverUrl;

  return "https://nekonoverse.org";
}

function saveServerUrl(url: string): void {
  const config = loadConfig();
  config.serverUrl = url;
  saveConfig(config);
}

// --- OAuth config per server ---

function loadOAuthConfig(url: string): OAuthConfig | null {
  const config = loadConfig();
  return config.oauth?.[url] ?? null;
}

function saveOAuthConfig(url: string, oauth: OAuthConfig): void {
  const config = loadConfig();
  if (!config.oauth) config.oauth = {};
  config.oauth[url] = oauth;
  saveConfig(config);
}

function clearOAuthToken(url: string): void {
  const config = loadConfig();
  if (config.oauth?.[url]) {
    config.oauth[url].access_token = null;
    saveConfig(config);
  }
}

// --- PKCE helpers ---

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

let serverUrl = getServerUrl();

const REDIRECT_URI = "http://localhost/oauth/callback";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// Register custom protocol before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: "nyandeck",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;

// --- OAuth flow ---

async function registerOAuthApp(
  baseUrl: string,
): Promise<{ client_id: string; client_secret: string }> {
  const resp = await net.fetch(`${baseUrl}/api/v1/apps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "nyandeck",
      redirect_uris: REDIRECT_URI,
      scopes: "read write",
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`App registration failed: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  return { client_id: data.client_id, client_secret: data.client_secret };
}

async function exchangeCodeForToken(
  baseUrl: string,
  code: string,
  clientId: string,
  clientSecret: string,
  codeVerifier: string,
): Promise<string> {
  const resp = await net.fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  return data.access_token;
}

async function revokeToken(
  baseUrl: string,
  token: string,
  clientId: string,
  clientSecret: string,
): Promise<void> {
  await net.fetch(`${baseUrl}/oauth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
}

function performOAuthLogin(baseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        // 1. Get or register client credentials
        let oauthConfig = loadOAuthConfig(baseUrl);
        if (!oauthConfig) {
          const { client_id, client_secret } =
            await registerOAuthApp(baseUrl);
          oauthConfig = { client_id, client_secret, access_token: null };
          saveOAuthConfig(baseUrl, oauthConfig);
        }

        // 2. Generate PKCE
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const state = crypto.randomBytes(16).toString("hex");

        // 3. Build authorize URL
        const params = new URLSearchParams({
          response_type: "code",
          client_id: oauthConfig.client_id,
          redirect_uri: REDIRECT_URI,
          scope: "read write",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          state,
        });
        const authorizeUrl = `${baseUrl}/oauth/authorize?${params}`;

        // 4. Open BrowserWindow
        const authWindow = new BrowserWindow({
          width: 600,
          height: 700,
          title: "nyandeck - Login",
          parent: mainWindow ?? undefined,
          modal: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
          },
        });

        let settled = false;

        const handleRedirect = async (_event: Event, url: string) => {
          if (settled || !url.startsWith(REDIRECT_URI)) return;
          settled = true;

          try {
            const callbackUrl = new URL(url);
            const code = callbackUrl.searchParams.get("code");
            const returnedState = callbackUrl.searchParams.get("state");

            if (!code) throw new Error("No authorization code received");
            if (returnedState !== state) throw new Error("State mismatch");

            // 5. Exchange code for token
            const accessToken = await exchangeCodeForToken(
              baseUrl,
              code,
              oauthConfig!.client_id,
              oauthConfig!.client_secret,
              codeVerifier,
            );

            // 6. Save token
            oauthConfig!.access_token = accessToken;
            saveOAuthConfig(baseUrl, oauthConfig!);

            authWindow.close();
            resolve();
          } catch (err) {
            authWindow.close();
            reject(err);
          }
        };

        authWindow.webContents.on(
          "will-redirect",
          handleRedirect as (...args: unknown[]) => void,
        );
        authWindow.webContents.on(
          "will-navigate",
          handleRedirect as (...args: unknown[]) => void,
        );

        authWindow.on("closed", () => {
          if (!settled) {
            reject(new Error("Login cancelled"));
          }
        });

        authWindow.loadURL(authorizeUrl);
      } catch (err) {
        reject(err);
      }
    })();
  });
}

// --- Create window ---

async function createWindow() {
  const distDir = path.join(__dirname, "..", "dist");

  protocol.handle("nyandeck", async (request) => {
    const url = new URL(request.url);

    // Proxy /api/* requests to the backend server with Bearer token injection
    if (url.pathname.startsWith("/api/")) {
      const backendUrl = `${serverUrl}${url.pathname}${url.search}`;
      const headers = new Headers(request.headers);

      // Inject OAuth Bearer token if available
      const oauthConfig = loadOAuthConfig(serverUrl);
      if (oauthConfig?.access_token) {
        headers.set("Authorization", `Bearer ${oauthConfig.access_token}`);
      }

      try {
        return await net.fetch(backendUrl, {
          method: request.method,
          headers,
          body: request.body,
          duplex: "half",
        } as RequestInit);
      } catch {
        return new Response(JSON.stringify({ error: "Server unreachable" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Proxy /oauth/* requests to the backend server (for token exchange etc.)
    if (url.pathname.startsWith("/oauth/")) {
      const backendUrl = `${serverUrl}${url.pathname}${url.search}`;
      try {
        return await net.fetch(backendUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          duplex: "half",
        } as RequestInit);
      } catch {
        return new Response(JSON.stringify({ error: "Server unreachable" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Serve local static files from dist/
    const filePath = path.join(
      distDir,
      url.pathname === "/" ? "index.html" : url.pathname,
    );

    // Security: ensure path stays within distDir
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(distDir))) {
      return new Response("Forbidden", { status: 403 });
    }

    try {
      const data = fs.readFileSync(resolved);
      const ext = path.extname(resolved);
      return new Response(data, {
        headers: {
          "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        },
      });
    } catch {
      // SPA fallback: serve index.html for unmatched routes
      const indexData = fs.readFileSync(path.join(distDir, "index.html"));
      return new Response(indexData, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  });

  // IPC handlers for server URL management
  ipcMain.handle("get-server-url", () => serverUrl);
  ipcMain.handle("set-server-url", (_event, url: string) => {
    serverUrl = url;
    saveServerUrl(url);
  });

  // OAuth IPC handlers
  ipcMain.handle("oauth-login", async () => {
    await performOAuthLogin(serverUrl);
  });

  ipcMain.handle("oauth-logout", async () => {
    const oauthConfig = loadOAuthConfig(serverUrl);
    if (oauthConfig?.access_token) {
      try {
        await revokeToken(
          serverUrl,
          oauthConfig.access_token,
          oauthConfig.client_id,
          oauthConfig.client_secret,
        );
      } catch {
        // Revocation failure is non-fatal
      }
      clearOAuthToken(serverUrl);
    }
  });

  ipcMain.handle("oauth-check", () => {
    const oauthConfig = loadOAuthConfig(serverUrl);
    return !!oauthConfig?.access_token;
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "nyandeck",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.loadURL("nyandeck://app/");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
