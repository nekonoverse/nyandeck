import { createSignal, Show, createEffect } from "solid-js";
import { composeState, closeComposer } from "../../stores/modals";
import NoteComposer from "../notes/NoteComposer";
import type { Note } from "@nekonoverse/ui/api/statuses";

export default function ComposeModal() {
  const [key, setKey] = createSignal(0);
  const [droppedFiles, setDroppedFiles] = createSignal<FileList | null>(null);

  // Increment key each time modal opens to reset the form
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

  // Handle keyboard shortcut
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeComposer();
    }
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
          <button class="compose-modal-close" onClick={closeComposer}>
            ✕
          </button>
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
    </Show>
  );
}
