import { createSignal, Show } from "solid-js";
import { useI18n } from "@nekonoverse/ui/i18n";
import { currentUser } from "@nekonoverse/ui/stores/auth";
import { defaultAvatar } from "@nekonoverse/ui/stores/instance";
import { addColumn, type ColumnType } from "../../stores/columns";
import { openComposer } from "../../stores/modals";
import SettingsPanel from "./SettingsPanel";
import AccountMenu from "./AccountMenu";

export default function Sidebar() {
  const { t } = useI18n();
  const [showSettings, setShowSettings] = createSignal(false);
  const [showAccountMenu, setShowAccountMenu] = createSignal(false);

  const user = () => currentUser();

  const handleAddColumn = (type: ColumnType) => {
    addColumn(type);
  };

  return (
    <>
      <div class="deck-sidebar">
        {/* Account avatar → account menu */}
        <div class="sidebar-top">
          <Show when={user()}>
            {(u) => (
              <button
                class="sidebar-avatar-btn"
                onClick={() => setShowAccountMenu(!showAccountMenu())}
                title={u().display_name || u().username}
              >
                <img
                  class="sidebar-avatar"
                  src={u().avatar_url || defaultAvatar()}
                  alt=""
                />
              </button>
            )}
          </Show>
        </div>

        {/* Compose button */}
        <button
          class="sidebar-btn sidebar-compose-btn"
          onClick={() => openComposer()}
          title={t("composer.post") || "Compose"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>

        {/* Column add buttons */}
        <div class="sidebar-columns">
          <button
            class="sidebar-btn"
            onClick={() => handleAddColumn("home")}
            title={t("timeline.home") || "Home"}
          >
            H
          </button>
          <button
            class="sidebar-btn"
            onClick={() => handleAddColumn("notifications")}
            title={t("notifications.title") || "Notifications"}
          >
            N
          </button>
          <button
            class="sidebar-btn"
            onClick={() => handleAddColumn("mentions")}
            title={t("notifications.mentions") || "Mentions"}
          >
            M
          </button>
          <button
            class="sidebar-btn"
            onClick={() => handleAddColumn("public")}
            title={t("timeline.public") || "Public"}
          >
            P
          </button>
        </div>

        {/* Bottom actions */}
        <div class="sidebar-bottom">
          <button
            class="sidebar-btn"
            onClick={() => setShowSettings(true)}
            title={t("settings.title") || "Settings"}
          >
            ⚙
          </button>
        </div>
      </div>

      <Show when={showAccountMenu()}>
        <AccountMenu onClose={() => setShowAccountMenu(false)} />
      </Show>

      <Show when={showSettings()}>
        <SettingsPanel onClose={() => setShowSettings(false)} />
      </Show>
    </>
  );
}
