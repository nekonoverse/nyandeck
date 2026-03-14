import { app, BrowserWindow, protocol, net } from "electron";
import path from "path";
import fs from "fs";

// --- Server URL configuration ---
// Priority: CLI arg > env var > config file > default
function getServerUrl(): string {
  const serverArg = process.argv.find((a) => a.startsWith("--server-url="));
  if (serverArg) return serverArg.split("=").slice(1).join("=");

  if (process.env.NYANDECK_SERVER_URL) return process.env.NYANDECK_SERVER_URL;

  const configPath = path.join(app.getPath("userData"), "config.json");
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.serverUrl) return config.serverUrl;
  } catch {
    /* no config file yet */
  }

  return "https://n.arkjp.net";
}

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

async function createWindow() {
  const serverUrl = getServerUrl();
  const distDir = path.join(__dirname, "..", "dist");

  protocol.handle("nyandeck", (request) => {
    const url = new URL(request.url);

    // Proxy /api/* requests to the backend server
    if (url.pathname.startsWith("/api/")) {
      const backendUrl = `${serverUrl}${url.pathname}${url.search}`;
      return net.fetch(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        duplex: "half",
      } as RequestInit);
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

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "nyandeck",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
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
