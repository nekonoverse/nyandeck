import { createSignal, Show, createEffect } from "solid-js";
import { composeState, closeComposer } from "../../stores/modals";
import NoteComposer from "../notes/NoteComposer";
import { useI18n } from "@nekonoverse/ui/i18n";
import type { Note } from "@nekonoverse/ui/api/statuses";

export default function ComposeModal() {
  const { t } = useI18n();
  const [key, setKey] = createSignal(0);
  const [droppedFiles, setDroppedFiles] = createSignal<FileList | null>(null);

  createEffect(() => {
    if (composeState().open) {
      setKey((k) => k + 1);
      setDroppedFiles(null);
    }
  });

  const handlePost = (_note: Note) => {
    closeComposer();
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains("compose-modal-overlay")) {
      closeComposer();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeComposer();
    }
  };

  const title = () => {
    if (composeState().replyTo) return t("reply.reply");
    if (composeState().quoteNote) return t("boost.quoting");
    return t("composer.post");
  };

  return (
    <Show when={composeState().open}>
      <div
        class="compose-modal-overlay"
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer?.files?.length) {
            setDroppedFiles(e.dataTransfer.files);
          }
        }}
      >
        <div class="compose-modal-content">
          <div class="compose-modal-header">
            <span class="compose-modal-title">{title()}</span>
            <button class="compose-modal-close" onClick={closeComposer}>
              ✕
            </button>
          </div>
          <div class="compose-modal-body">
            <NoteComposer
              key={key()}
              onPost={handlePost}
              replyTo={composeState().replyTo}
              onClearReply={closeComposer}
              quoteNote={composeState().quoteNote}
              onClearQuote={() => {}}
              externalFiles={droppedFiles()}
            />
          </div>
        </div>
      </div>
    </Show>
  );
}
