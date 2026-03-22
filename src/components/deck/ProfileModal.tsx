import { createSignal, createEffect, Show, For } from "solid-js";
import {
  getAccount,
  lookupAccount,
  getAccountStatuses,
  followAccount,
  unfollowAccount,
  type Account,
} from "@nekonoverse/ui/api/accounts";
import { getNote, type Note } from "@nekonoverse/ui/api/statuses";
import { profileState, closeProfile } from "../../stores/modals";
import { currentUser } from "@nekonoverse/ui/stores/auth";
import { isFollowing, addFollowedId, removeFollowedId } from "@nekonoverse/ui/stores/followedUsers";
import { useI18n } from "@nekonoverse/ui/i18n";
import { sanitizeHtml } from "@nekonoverse/ui/utils/sanitize";
import { emojify } from "@nekonoverse/ui/utils/emojify";
import { twemojify } from "@nekonoverse/ui/utils/twemojify";
import { defaultAvatar } from "@nekonoverse/ui/stores/instance";
import NoteCard from "../notes/NoteCard";

export default function ProfileModal() {
  const { t } = useI18n();
  const [account, setAccount] = createSignal<Account | null>(null);
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [followLoading, setFollowLoading] = createSignal(false);
  const [showUnfollow, setShowUnfollow] = createSignal(false);

  createEffect(async () => {
    const state = profileState();
    if (!state.open) {
      setAccount(null);
      setNotes([]);
      return;
    }
    setLoading(true);
    try {
      let acc: Account;
      if (state.accountId) {
        acc = await getAccount(state.accountId);
      } else if (state.acct) {
        acc = await lookupAccount(state.acct);
      } else {
        setLoading(false);
        return;
      }
      setAccount(acc);
      const statuses = await getAccountStatuses(acc.id, { limit: 20 });
      setNotes(statuses);
    } catch {
      // ignore
    }
    setLoading(false);
  });

  const isOwn = () => {
    const user = currentUser();
    const acc = account();
    if (!user || !acc) return true;
    return user.username === acc.username && !acc.acct.includes("@");
  };

  const followed = () => {
    const acc = account();
    return acc ? isFollowing(acc.id) : false;
  };

  const handleFollow = async () => {
    const acc = account();
    if (!acc) return;
    setFollowLoading(true);
    try {
      await followAccount(acc.id);
      addFollowedId(acc.id);
    } catch {}
    setFollowLoading(false);
  };

  const handleUnfollow = async () => {
    const acc = account();
    if (!acc) return;
    setFollowLoading(true);
    try {
      await unfollowAccount(acc.id);
      removeFollowedId(acc.id);
    } catch {}
    setFollowLoading(false);
    setShowUnfollow(false);
  };

  const refreshNote = async (noteId: string) => {
    try {
      const updated = await getNote(noteId);
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id === noteId) return updated;
          if (n.reblog?.id === noteId) return { ...n, reblog: updated };
          return n;
        }),
      );
    } catch {}
  };

  return (
    <Show when={profileState().open}>
      <div class="profile-modal-overlay" onClick={closeProfile}>
        <div class="profile-modal-content" onClick={(e) => e.stopPropagation()}>
          <button class="profile-modal-close" onClick={closeProfile}>
            ✕
          </button>

          <Show
            when={!loading() && account()}
            fallback={
              <div class="profile-modal-loading">
                {t("common.loading")}
              </div>
            }
          >
            {(() => {
              const acc = account()!;
              return (
                <>
                  {/* Header */}
                  <div class="profile-modal-header">
                    <Show when={acc.header && !acc.header.includes("missing.png")}>
                      <img class="profile-modal-banner" src={acc.header} alt="" />
                    </Show>
                    <div class="profile-modal-info">
                      <img
                        class="profile-modal-avatar"
                        src={acc.avatar || defaultAvatar()}
                        alt=""
                      />
                      <div class="profile-modal-names">
                        <strong
                          class="profile-modal-display-name"
                          ref={(el) => {
                            el.textContent = acc.display_name || acc.username;
                            if (acc.emojis) emojify(el, acc.emojis);
                            twemojify(el);
                          }}
                        />
                        <span class="profile-modal-handle">@{acc.acct}</span>
                      </div>
                      <Show when={currentUser() && !isOwn()}>
                        <div class="profile-modal-actions">
                          <Show
                            when={followed()}
                            fallback={
                              <button
                                class="profile-modal-follow-btn"
                                onClick={handleFollow}
                                disabled={followLoading()}
                              >
                                {t("profile.follow")}
                              </button>
                            }
                          >
                            <button
                              class="profile-modal-follow-btn following"
                              onClick={() => setShowUnfollow(true)}
                            >
                              {t("profile.following")}
                            </button>
                          </Show>
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* Bio */}
                  <Show when={acc.note}>
                    <div
                      class="profile-modal-bio"
                      ref={(el) => {
                        el.innerHTML = sanitizeHtml(acc.note);
                        if (acc.emojis) emojify(el, acc.emojis);
                        twemojify(el);
                      }}
                    />
                  </Show>

                  {/* Stats */}
                  <div class="profile-modal-stats">
                    <span>
                      <strong>{acc.statuses_count ?? 0}</strong> {t("profile.posts" as any)}
                    </span>
                    <span>
                      <strong>{acc.following_count ?? 0}</strong> {t("profile.following")}
                    </span>
                    <span>
                      <strong>{acc.followers_count ?? 0}</strong> {t("profile.followers" as any)}
                    </span>
                  </div>

                  {/* Fields */}
                  <Show when={acc.fields && acc.fields.length > 0}>
                    <div class="profile-modal-fields">
                      <For each={acc.fields}>
                        {(field) => (
                          <div class="profile-modal-field">
                            <span class="profile-modal-field-name">{field.name}</span>
                            <span
                              class="profile-modal-field-value"
                              ref={(el) => {
                                el.innerHTML = sanitizeHtml(field.value);
                              }}
                            />
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>

                  {/* Notes */}
                  <div class="profile-modal-timeline">
                    <For each={notes()}>
                      {(note) => (
                        <NoteCard
                          note={note}
                          onReactionUpdate={() => refreshNote(note.id)}
                          onDelete={(id) =>
                            setNotes((prev) => prev.filter((n) => n.id !== id))
                          }
                        />
                      )}
                    </For>
                    <Show when={notes().length === 0 && !loading()}>
                      <p class="profile-modal-empty">{t("timeline.empty")}</p>
                    </Show>
                  </div>
                </>
              );
            })()}
          </Show>

          {/* Unfollow confirmation */}
          <Show when={showUnfollow()}>
            <div class="modal-overlay" onClick={() => setShowUnfollow(false)}>
              <div
                class="modal-content"
                style="max-width: 360px"
                onClick={(e) => e.stopPropagation()}
              >
                <div class="modal-header">
                  <h3>{t("profile.confirmUnfollow")}</h3>
                  <button class="modal-close" onClick={() => setShowUnfollow(false)}>
                    ✕
                  </button>
                </div>
                <div style="padding: 16px; display: flex; gap: 8px; justify-content: flex-end">
                  <button class="btn btn-small" onClick={() => setShowUnfollow(false)}>
                    {t("common.cancel")}
                  </button>
                  <button
                    class="btn btn-small btn-danger"
                    disabled={followLoading()}
                    onClick={handleUnfollow}
                  >
                    {t("profile.unfollow")}
                  </button>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
