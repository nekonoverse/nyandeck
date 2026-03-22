import { createSignal, Show } from "solid-js";
import { useI18n } from "@nekonoverse/ui/i18n";
import { currentUser } from "@nekonoverse/ui/stores/auth";
import { logout } from "@nekonoverse/ui/stores/auth";
import { defaultAvatar } from "@nekonoverse/ui/stores/instance";
import { addColumn, type ColumnType } from "../../stores/columns";
import SettingsPanel from "./SettingsPanel";

export default function Sidebar() {
  const { t } = useI18n();
  const [showSettings, setShowSettings] = createSignal(false);

  const user = () => currentUser();

  const handleLogout = async () => {
    if (window.nyandeck) {
      await window.nyandeck.oauthLogout();
    }
    await logout();
  };

  const handleAddColumn = (type: ColumnType) => {
    addColumn(type);
  };

  return (
    <>
      <div class="deck-sidebar">
        {/* Account avatar */}
        <div class="sidebar-top">
          <Show when={user()}>
            {(u) => (
              <button
                class="sidebar-avatar-btn"
                onClick={() => {
                  const handle = u().domain
                    ? `@${u().username}@${u().domain}`
                    : `@${u().username}`;
                  window.open(`/${handle}`, "_blank");
                }}
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
          <button
            class="sidebar-btn sidebar-logout"
            onClick={handleLogout}
            title={t("auth.logout") || "Logout"}
          >
            ⏻
          </button>
        </div>
      </div>

      <Show when={showSettings()}>
        <SettingsPanel onClose={() => setShowSettings(false)} />
      </Show>
    </>
  );
}
