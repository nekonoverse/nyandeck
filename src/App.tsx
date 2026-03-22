import { onMount, onCleanup, createEffect, Show } from "solid-js";
import { I18nProvider } from "@nekonoverse/ui/i18n";
import { initTheme } from "@nekonoverse/ui/stores/theme";
import { fetchCurrentUser, currentUser, authLoading } from "@nekonoverse/ui/stores/auth";
import { fetchInstance, startVersionPolling } from "@nekonoverse/ui/stores/instance";
import { connect, disconnect } from "@nekonoverse/ui/stores/streaming";
import DeckLayout from "./components/deck/DeckLayout";
import LoginScreen from "./components/LoginScreen";

initTheme();

export default function App() {
  onMount(async () => {
    fetchInstance();
    if (window.nyandeck) {
      // Electron: check for saved OAuth token before fetching user
      const hasToken = await window.nyandeck.oauthCheck();
      if (hasToken) {
        fetchCurrentUser();
      }
    } else {
      // Dev mode: cookie-based auth
      fetchCurrentUser();
    }
  });

  const stopPolling = startVersionPolling();
  onCleanup(stopPolling);

  createEffect(() => {
    if (currentUser()) {
      connect();
    } else {
      disconnect();
    }
  });
  onCleanup(disconnect);

  return (
    <I18nProvider>
      <Show when={!authLoading()} fallback={<div class="loading-screen" />}>
        <Show when={currentUser()} fallback={<LoginScreen />}>
          <DeckLayout />
        </Show>
      </Show>
    </I18nProvider>
  );
}
