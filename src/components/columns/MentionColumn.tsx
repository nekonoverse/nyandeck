import { createSignal, onMount, onCleanup, Show, For } from "solid-js";
import {
  getNotifications,
  dismissNotification,
  type Notification,
} from "@nekonoverse/ui/api/notifications";
import NoteCard from "../notes/NoteCard";
import { emojify } from "@nekonoverse/ui/utils/emojify";
import { twemojify } from "@nekonoverse/ui/utils/twemojify";
import { formatTimestamp, useTimeTick } from "@nekonoverse/ui/utils/formatTime";
import { getNote } from "@nekonoverse/ui/api/statuses";
import { onNotification, onReaction } from "@nekonoverse/ui/stores/streaming";
import { useI18n } from "@nekonoverse/ui/i18n";
import { defaultAvatar } from "@nekonoverse/ui/stores/instance";
import { navigateToProfile } from "../../stores/modals";

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

export default function MentionColumn() {
  const { t } = useI18n();
  const [mentions, setMentions] = createSignal<Notification[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);

  let sentinelRef: HTMLDivElement | undefined;
  let observer: IntersectionObserver | undefined;
  let scrollContainer: HTMLDivElement | undefined;

  const load = async () => {
    try {
      const data = await getNotifications({ limit: 20, types: ["mention"] });
      setMentions(data);
      setHasMore(data.length >= 20);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    load();
  });

  const unsub = onNotification(async () => {
    try {
      const fresh = await getNotifications({ limit: 1, types: ["mention"] });
      if (fresh.length > 0) {
        setMentions((prev) => {
          if (prev.some((n) => n.id === fresh[0].id)) return prev;
          return [fresh[0], ...prev];
        });
      }
    } catch {
      /* ignore */
    }
  });

  const unsubReaction = onReaction(async (data) => {
    const { id } = data as { id: string };
    if (!id) return;
    if (mentions().some((n) => n.status?.id === id)) {
      await refreshNote(id);
    }
  });

  onCleanup(() => {
    unsub();
    unsubReaction();
    observer?.disconnect();
  });

  const loadMore = async () => {
    const current = mentions();
    if (current.length === 0 || loadingMore()) return;
    setLoadingMore(true);
    try {
      const older = await getNotifications({
        max_id: current[current.length - 1].id,
        limit: 20,
        types: ["mention"],
      });
      setMentions([...current, ...older]);
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

  const handleDismiss = async (id: string) => {
    try {
      await dismissNotification(id);
      setMentions((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      // ignore
    }
  };

  const refreshNote = async (noteId: string) => {
    try {
      const updated = await getNote(noteId);
      setMentions((prev) =>
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

  return (
    <div
      class="column-scroll"
      ref={(el) => { scrollContainer = el; }}
    >
      <Show when={!loading()} fallback={<p class="column-loading">{t("common.loading")}</p>}>
        <Show
          when={mentions().length > 0}
          fallback={<p class="column-empty">{t("notifications.empty")}</p>}
        >
          <div class="notifications-list">
            <For each={mentions()}>
              {(notif) => (
                <div class={`notification-item${notif.read ? "" : " unread"}`}>
                  <div class="notification-icon">💬</div>
                  <div class="notification-body">
                    <div class="notification-meta">
                      <Show when={notif.account}>
                        <a
                          href={profileUrl(notif.account)}
                          class="notification-actor"
                          onClick={(e) => {
                            e.preventDefault();
                            if (notif.account) navigateToProfile(notif.account);
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
          <Show when={!hasMore() && mentions().length > 0}>
            <p class="column-end">{t("timeline.noMore")}</p>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
