import { onMount, onCleanup, createEffect } from "solid-js";
import { I18nProvider } from "@nekonoverse/ui/i18n";
import { initTheme } from "@nekonoverse/ui/stores/theme";
import { fetchCurrentUser, currentUser } from "@nekonoverse/ui/stores/auth";
import { fetchInstance, startVersionPolling } from "@nekonoverse/ui/stores/instance";
import { connect, disconnect } from "@nekonoverse/ui/stores/streaming";
import DeckLayout from "./components/deck/DeckLayout";

initTheme();

export default function App() {
  onMount(() => {
    fetchCurrentUser();
    fetchInstance();
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
      <DeckLayout />
    </I18nProvider>
  );
}
