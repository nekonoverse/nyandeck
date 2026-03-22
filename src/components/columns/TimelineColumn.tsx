import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  Show,
  For,
  untrack,
} from "solid-js";
import { currentUser, authLoading } from "@nekonoverse/ui/stores/auth";
import {
  getPublicTimeline,
  getHomeTimeline,
  getNote,
  type Note,
} from "@nekonoverse/ui/api/statuses";
import { onUpdate, onReaction } from "@nekonoverse/ui/stores/streaming";
import { useI18n } from "@nekonoverse/ui/i18n";
import NoteCard from "../notes/NoteCard";
import NoteComposer from "../notes/NoteComposer";

interface Props {
  mode: "home" | "public";
}

export default function TimelineColumn(props: Props) {
  const { t } = useI18n();
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [initialLoading, setInitialLoading] = createSignal(true);
  const [newNoteIds, setNewNoteIds] = createSignal<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);
  const [bufferedNotes, setBufferedNotes] = createSignal<Note[]>([]);
  const [isAtTop, setIsAtTop] = createSignal(true);

  let sentinelRef: HTMLDivElement | undefined;
  let observer: IntersectionObserver | undefined;
  let scrollContainer: HTMLDivElement | undefined;

  const setSentinelRef = (el: HTMLDivElement) => {
    sentinelRef = el;
    if (observer && el) observer.observe(el);
  };

  const isHome = () => props.mode === "home";

  const loadTimeline = async () => {
    try {
      const data = untrack(isHome)
        ? await getHomeTimeline()
        : await getPublicTimeline();
      setNotes(data);
      setHasMore(data.length >= 20);
      setBufferedNotes([]);
    } catch {
      // ignore
    } finally {
      setInitialLoading(false);
    }
  };

  const loadOlderNotes = async () => {
    if (loadingMore() || !hasMore()) return;
    const current = notes();
    if (current.length === 0) return;
    const lastId = current[current.length - 1].id;
    setLoadingMore(true);
    try {
      const data = untrack(isHome)
        ? await getHomeTimeline({ max_id: lastId })
        : await getPublicTimeline({ max_id: lastId });
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setNotes((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const unique = data.filter((n) => !existingIds.has(n.id));
          return [...prev, ...unique];
        });
        if (data.length < 20) setHasMore(false);
      }
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

  const handleScroll = () => {
    if (!scrollContainer) return;
    setIsAtTop(scrollContainer.scrollTop < 100);
  };

  const flushBuffer = () => {
    const buffered = bufferedNotes();
    if (buffered.length === 0) return;
    setNotes((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const unique = buffered.filter((n) => !existingIds.has(n.id));
      return [...unique, ...prev];
    });
    for (const n of buffered) {
      setNewNoteIds((s) => new Set(s).add(n.id));
      setTimeout(
        () =>
          setNewNoteIds((s) => {
            const next = new Set(s);
            next.delete(n.id);
            return next;
          }),
        600,
      );
    }
    setBufferedNotes([]);
    scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
  };

  createEffect(() => {
    if (isAtTop() && bufferedNotes().length > 0) flushBuffer();
  });

  let loaded = false;
  createEffect(() => {
    if (!authLoading() && !loaded) {
      loaded = true;
      loadTimeline();
    }
  });

  // SSE updates (only for home mode — public uses polling)
  let unsub: (() => void) | undefined;
  if (props.mode === "home") {
    unsub = onUpdate(async (data) => {
      const { id } = data as { id: string };
      if (!id) return;
      try {
        const note = await getNote(id);
        if (notes().some((n) => n.id === id)) {
          setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
          return;
        }
        if (bufferedNotes().some((n) => n.id === id)) return;

        if (isAtTop()) {
          setNotes((prev) => {
            if (prev.some((n) => n.id === id)) return prev;
            return [note, ...prev];
          });
          setNewNoteIds((s) => new Set(s).add(id));
          setTimeout(
            () =>
              setNewNoteIds((s) => {
                const next = new Set(s);
                next.delete(id);
                return next;
              }),
            600,
          );
        } else {
          setBufferedNotes((prev) => {
            if (prev.some((n) => n.id === id)) return prev;
            return [note, ...prev];
          });
        }
      } catch {
        /* ignore */
      }
    });
  }

  const pendingReactionRefresh = new Map<string, ReturnType<typeof setTimeout>>();
  const unsubReaction = onReaction(async (data) => {
    const { id } = data as { id: string };
    if (!id) return;
    if (notes().some((n) => n.id === id || n.reblog?.id === id)) {
      const existing = pendingReactionRefresh.get(id);
      if (existing) clearTimeout(existing);
      pendingReactionRefresh.set(
        id,
        setTimeout(async () => {
          pendingReactionRefresh.delete(id);
          await refreshNote(id);
        }, 500),
      );
    }
  });

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadOlderNotes();
      },
      { root: scrollContainer, rootMargin: "200px" },
    );
    if (sentinelRef) observer.observe(sentinelRef);
  });

  onCleanup(() => {
    unsub?.();
    unsubReaction();
    pendingReactionRefresh.forEach((timer) => clearTimeout(timer));
    pendingReactionRefresh.clear();
    observer?.disconnect();
  });

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
    } catch {
      // ignore
    }
  };

  return (
    <div
      class="column-scroll"
      ref={(el) => { scrollContainer = el; }}
      onScroll={handleScroll}
    >
      <Show when={isHome()}>
        <NoteComposer
          onPost={(note) => {
            setNotes((prev) => [note, ...prev]);
          }}
        />
      </Show>

      <Show when={bufferedNotes().length > 0}>
        <button class="new-posts-banner" onClick={flushBuffer}>
          {t("timeline.newPosts").replace("{count}", String(bufferedNotes().length))}
        </button>
      </Show>

      <Show
        when={!initialLoading()}
        fallback={<p class="column-loading">{t("timeline.loading")}</p>}
      >
        <Show
          when={notes().length > 0}
          fallback={<p class="column-empty">{t("timeline.empty")}</p>}
        >
          <For each={notes()}>
            {(note) => (
              <div class={newNoteIds().has(note.id) ? "note-slide-in" : ""}>
                <NoteCard
                  note={note}
                  onReactionUpdate={() => refreshNote(note.id)}
                  onDelete={(id) =>
                    setNotes((prev) => prev.filter((n) => n.id !== id))
                  }
                />
              </div>
            )}
          </For>
        </Show>

        <div ref={setSentinelRef} class="timeline-sentinel" />

        <Show when={loadingMore()}>
          <p class="column-loading">{t("timeline.loadingMore")}</p>
        </Show>
        <Show when={!hasMore() && notes().length > 0}>
          <p class="column-end">{t("timeline.noMore")}</p>
        </Show>
      </Show>
    </div>
  );
}
