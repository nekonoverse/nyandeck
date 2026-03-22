import { createSignal, onMount, onCleanup, Show, For } from "solid-js";
import {
  getNotifications,
  dismissNotification,
  clearNotifications,
  type Notification,
} from "@nekonoverse/ui/api/notifications";
import NoteCard from "../notes/NoteCard";
import Emoji from "../Emoji";
import { emojify } from "@nekonoverse/ui/utils/emojify";
import { twemojify } from "@nekonoverse/ui/utils/twemojify";
import { formatTimestamp, useTimeTick } from "@nekonoverse/ui/utils/formatTime";
import { getNote } from "@nekonoverse/ui/api/statuses";
import { onNotification, onReaction, resetUnread } from "@nekonoverse/ui/stores/streaming";
import { useI18n } from "@nekonoverse/ui/i18n";
import { defaultAvatar } from "@nekonoverse/ui/stores/instance";
import type { Dictionary } from "@nekonoverse/ui/i18n/dictionaries/ja";

function actorHandle(account: Notification["account"]): string {
  if (!account) return "";
  return account.domain
    ? `@${account.username}@${account.domain}`
    : `@${account.username}`;
}

function profileUrl(account: Notification["account"]): string {
  if (!account) return "#";
  return account.domain
    ? `/@${account.username}@${account.domain}`
    : `/@${account.username}`;
}

export default function NotificationColumn() {
  const { t } = useI18n();
  const [notifications, setNotifications] = createSignal<Notification[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);

  let sentinelRef: HTMLDivElement | undefined;
  let observer: IntersectionObserver | undefined;
  let scrollContainer: HTMLDivElement | undefined;

  const load = async () => {
    try {
      const data = await getNotifications({ limit: 20 });
      setNotifications(data);
      setHasMore(data.length >= 20);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    load();
    resetUnread();
  });

  const unsub = onNotification(async () => {
    try {
      const fresh = await getNotifications({ limit: 1 });
      if (fresh.length > 0) {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === fresh[0].id)) return prev;
          return [fresh[0], ...prev];
        });
      }
    } catch {
      /* ignore */
    }
    resetUnread();
  });

  const unsubReaction = onReaction(async (data) => {
    const { id } = data as { id: string };
    if (!id) return;
    if (notifications().some((n) => n.status?.id === id)) {
      await refreshNote(id);
    }
  });

  onCleanup(() => {
    unsub();
    unsubReaction();
    observer?.disconnect();
  });

  const loadMore = async () => {
    const current = notifications();
    if (current.length === 0 || loadingMore()) return;
    setLoadingMore(true);
    try {
      const older = await getNotifications({
        max_id: current[current.length - 1].id,
        limit: 20,
      });
      setNotifications([...current, ...older]);
      setHasMore(older.length >= 20);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
      if (observer && sentinelRef && hasMore()) {
        observer.unobserve(sentinelRef);
        observer.observe(sentinelRef);
      }
    }
  };

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: scrollContainer, rootMargin: "200px" },
    );
    if (sentinelRef) observer.observe(sentinelRef);
  });

  const handleClearAll = async () => {
    try {
      await clearNotifications();
      setNotifications([]);
    } catch {
      // ignore
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissNotification(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      // ignore
    }
  };

  const refreshNote = async (noteId: string) => {
    try {
      const updated = await getNote(noteId);
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.status?.id === noteId) return { ...n, status: updated };
          if (n.status?.reblog?.id === noteId) {
            return { ...n, status: { ...n.status, reblog: updated } };
          }
          return n;
        }),
      );
    } catch {
      // ignore
    }
  };

  const notifIcon = (type: string) => {
    switch (type) {
      case "follow":
        return "👤";
      case "follow_request":
        return "👤";
      case "mention":
        return "💬";
      case "reblog":
      case "renote":
        return "🔁";
      case "favourite":
        return "⭐";
      case "reaction":
        return "✨";
      case "status":
        return "📝";
      default:
        return "🔔";
    }
  };

  return (
    <div
      class="column-scroll"
      ref={(el) => { scrollContainer = el; }}
    >
      <div class="column-toolbar">
        <Show when={notifications().length > 0}>
          <button class="btn btn-small" onClick={handleClearAll}>
            {t("notifications.clearAll")}
          </button>
        </Show>
      </div>

      <Show when={!loading()} fallback={<p class="column-loading">{t("common.loading")}</p>}>
        <Show
          when={notifications().length > 0}
          fallback={<p class="column-empty">{t("notifications.empty")}</p>}
        >
          <div class="notifications-list">
            <For each={notifications()}>
              {(notif) => (
                <div class={`notification-item${notif.read ? "" : " unread"}`}>
                  <div class="notification-icon">{notifIcon(notif.type)}</div>
                  <div class="notification-body">
                    <div class="notification-meta">
                      <Show when={notif.account}>
                        <a
                          href={profileUrl(notif.account)}
                          class="notification-actor"
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(profileUrl(notif.account), "_blank");
                          }}
                        >
                          <img
                            class="notification-avatar"
                            src={notif.account!.avatar_url || defaultAvatar()}
                            alt=""
                          />
                          <strong
                            ref={(el) => {
                              el.textContent =
                                notif.account!.display_name ||
                                notif.account!.username;
                              emojify(el, notif.account!.emojis || []);
                              twemojify(el);
                            }}
                          />
                        </a>
                      </Show>
                      <span class="notification-type-text">
                        {t(
                          `notifications.type.${notif.type}` as keyof Dictionary,
                        )}
                      </span>
                      <Show when={notif.type === "reaction" && notif.emoji}>
                        <span class="notification-emoji">
                          <Emoji emoji={notif.emoji!} url={notif.emoji_url} />
                        </span>
                      </Show>
                      <Show when={!notif.read}>
                        <button
                          class="notification-dismiss"
                          onClick={() => handleDismiss(notif.id)}
                          title={t("notifications.dismiss")}
                        >
                          ✕
                        </button>
                      </Show>
                    </div>
                    <span class="notification-time">
                      {(() => {
                        useTimeTick();
                        return formatTimestamp(notif.created_at, t);
                      })()}
                    </span>
                    <Show when={notif.status}>
                      <div class="notification-note">
                        <NoteCard
                          note={notif.status!}
                          onReactionUpdate={() =>
                            refreshNote(notif.status!.id)
                          }
                        />
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>

          <div
            ref={(el) => {
              sentinelRef = el;
              if (observer) observer.observe(el);
            }}
            class="timeline-sentinel"
          />

          <Show when={loadingMore()}>
            <p class="column-loading">{t("common.loading")}</p>
          </Show>
          <Show when={!hasMore() && notifications().length > 0}>
            <p class="column-end">{t("timeline.noMore")}</p>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
