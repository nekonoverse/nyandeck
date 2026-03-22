import { createSignal, onMount, Show } from "solid-js";
import {
  login,
  loginWithPasskey,
  completeTotpLogin,
  fetchCurrentUser,
} from "@nekonoverse/ui/stores/auth";
import { fetchInstance, instance } from "@nekonoverse/ui/stores/instance";
import { useI18n } from "@nekonoverse/ui/i18n";

declare global {
  interface Window {
    nyandeck?: {
      getServerUrl(): Promise<string>;
      setServerUrl(url: string): Promise<void>;
      oauthLogin(): Promise<void>;
      oauthLogout(): Promise<void>;
      oauthCheck(): Promise<boolean>;
    };
  }
}

export default function LoginScreen() {
  const { t } = useI18n();

  // Server URL (Electron only)
  const [serverUrl, setServerUrl] = createSignal("");
  const [serverEditing, setServerEditing] = createSignal(false);
  const [serverDraft, setServerDraft] = createSignal("");
  const [serverLoading, setServerLoading] = createSignal(false);
  const isElectron = () => !!window.nyandeck;

  // Login form (dev mode only)
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  // TOTP (dev mode only)
  const [totpRequired, setTotpRequired] = createSignal(false);
  const [totpToken, setTotpToken] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [totpLoading, setTotpLoading] = createSignal(false);

  // Passkey (dev mode only)
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);

  // OAuth (Electron mode)
  const [oauthLoading, setOauthLoading] = createSignal(false);

  onMount(async () => {
    if (window.nyandeck) {
      const url = await window.nyandeck.getServerUrl();
      setServerUrl(url);
      setServerDraft(url);
    }
  });

  const handleServerChange = async () => {
    const url = serverDraft().trim().replace(/\/+$/, "");
    if (!url || url === serverUrl()) {
      setServerEditing(false);
      return;
    }
    setServerLoading(true);
    setError("");
    try {
      await window.nyandeck!.setServerUrl(url);
      setServerUrl(url);
      setServerEditing(false);
      await fetchInstance();
    } catch {
      setError(t("auth.serverError") || "Failed to connect to server");
    } finally {
      setServerLoading(false);
    }
  };

  // --- Electron OAuth login ---
  const handleOAuthLogin = async () => {
    setError("");
    setOauthLoading(true);
    try {
      await window.nyandeck!.oauthLogin();
      await fetchCurrentUser();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.loginFailed") || "Login failed",
      );
    } finally {
      setOauthLoading(false);
    }
  };

  // --- Dev mode direct login ---
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await login(username(), password());
      if (resp.requires_totp && resp.totp_token) {
        setTotpRequired(true);
        setTotpToken(resp.totp_token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setTotpLoading(true);
    try {
      await completeTotpLogin(totpCode(), totpToken());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setTotpLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError("");
    setPasskeyLoading(true);
    try {
      await loginWithPasskey();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.passkeyFailed") || "Passkey auth failed",
      );
    } finally {
      setPasskeyLoading(false);
    }
  };

  const isPasskeySupported = () =>
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined";

  return (
    <div class="login-screen">
      <div class="login-container">
        <h1 class="login-title">nyandeck</h1>
        <Show when={instance()?.title}>
          <p class="login-instance">{instance()!.title}</p>
        </Show>

        {/* Server URL section (Electron only) */}
        <Show when={isElectron()}>
          <div class="server-url-section">
            <label class="server-url-label" for="server-url">
              {t("auth.serverUrl") || "Server URL"}
            </label>
            <div class="server-url-edit">
              <input
                id="server-url"
                type="url"
                placeholder="https://example.com"
                value={serverDraft()}
                onInput={(e) => setServerDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleServerChange();
                }}
                disabled={serverLoading()}
              />
              <Show when={serverDraft() !== serverUrl()}>
                <button
                  onClick={handleServerChange}
                  disabled={serverLoading()}
                  class="btn-connect"
                >
                  {serverLoading()
                    ? t("common.loading") || "..."
                    : t("auth.connect") || "Connect"}
                </button>
              </Show>
            </div>
          </div>
        </Show>

        {/* Error message */}
        <Show when={error()}>
          <div class="auth-error">{error()}</div>
        </Show>

        {/* Electron mode: OAuth login button */}
        <Show when={isElectron()}>
          <div class="auth-form">
            <button
              type="button"
              disabled={oauthLoading()}
              onClick={handleOAuthLogin}
            >
              {oauthLoading()
                ? t("auth.loggingIn") || "Logging in..."
                : t("common.login") || "Login"}
            </button>
          </div>
        </Show>

        {/* Dev mode: direct login form */}
        <Show when={!isElectron()}>
          <Show
            when={!totpRequired()}
            fallback={
              <form onSubmit={handleTotpSubmit} class="auth-form">
                <h2>{t("totp.required") || "Two-factor authentication"}</h2>
                <div class="field">
                  <label for="totp-code">
                    {t("totp.enterCode") || "Enter code"}
                  </label>
                  <input
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    autocomplete="one-time-code"
                    maxLength={10}
                    value={totpCode()}
                    onInput={(e) => setTotpCode(e.currentTarget.value)}
                    required
                    autofocus
                  />
                </div>
                <button type="submit" disabled={totpLoading() || !totpCode().trim()}>
                  {totpLoading()
                    ? t("auth.loggingIn") || "Verifying..."
                    : t("totp.verify") || "Verify"}
                </button>
              </form>
            }
          >
            <form onSubmit={handleSubmit} class="auth-form">
              <div class="field">
                <label for="username">
                  {t("auth.username") || "Username"}
                </label>
                <input
                  id="username"
                  type="text"
                  value={username()}
                  onInput={(e) => setUsername(e.currentTarget.value)}
                  required
                />
              </div>
              <div class="field">
                <label for="password">
                  {t("auth.password") || "Password"}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading()}>
                {loading()
                  ? t("auth.loggingIn") || "Logging in..."
                  : t("common.login") || "Login"}
              </button>

              <Show when={isPasskeySupported()}>
                <div class="passkey-divider">
                  <span>{t("auth.or") || "or"}</span>
                </div>
                <button
                  type="button"
                  class="btn-passkey"
                  disabled={passkeyLoading()}
                  onClick={handlePasskeyLogin}
                >
                  {passkeyLoading()
                    ? t("auth.authenticating") || "Authenticating..."
                    : t("auth.loginWithPasskey") || "Login with Passkey"}
                </button>
              </Show>
            </form>
          </Show>
        </Show>
      </div>
    </div>
  );
}
