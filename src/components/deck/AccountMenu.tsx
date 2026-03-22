import { createSignal, Show, onCleanup } from "solid-js";
import { currentUser, logout } from "@nekonoverse/ui/stores/auth";
import { instance } from "@nekonoverse/ui/stores/instance";
import { defaultAvatar } from "@nekonoverse/ui/stores/instance";
import { useI18n } from "@nekonoverse/ui/i18n";
import { emojify } from "@nekonoverse/ui/utils/emojify";
import { twemojify } from "@nekonoverse/ui/utils/twemojify";

interface Props {
  onClose: () => void;
}

export default function AccountMenu(props: Props) {
  const { t } = useI18n();
  const user = () => currentUser();

  const handleLogout = async () => {
    if (window.nyandeck) {
      await window.nyandeck.oauthLogout();
    }
    await logout();
    props.onClose();
  };

  const serverName = () => {
    const inst = instance();
    if (inst?.title) return inst.title;
    if (inst?.uri) return inst.uri;
    return null;
  };

  return (
    <div class="account-menu-backdrop" onClick={props.onClose}>
      <div class="account-menu" onClick={(e) => e.stopPropagation()}>
        <Show when={user()}>
          {(u) => (
            <div class="account-menu-user">
              <img
                class="account-menu-avatar"
                src={u().avatar_url || defaultAvatar()}
                alt=""
              />
              <div class="account-menu-names">
                <strong
                  class="account-menu-display-name"
                  ref={(el) => {
                    el.textContent = u().display_name || u().username;
                    twemojify(el);
                  }}
                />
                <span class="account-menu-handle">
                  @{u().username}{u().domain ? `@${u().domain}` : ""}
                </span>
              </div>
            </div>
          )}
        </Show>

        <Show when={serverName()}>
          {(name) => (
            <div class="account-menu-server">
              <span class="account-menu-server-label">{name()}</span>
            </div>
          )}
        </Show>

        <div class="account-menu-divider" />

        <button class="account-menu-item account-menu-logout" onClick={handleLogout}>
          {t("auth.logout")}
        </button>
      </div>
    </div>
  );
}
