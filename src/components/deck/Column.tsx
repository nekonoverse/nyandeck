import { createSignal, type JSX } from "solid-js";
import { useI18n } from "@nekonoverse/ui/i18n";
import {
  removeColumn,
  reorderColumns,
  setColumnWidth,
  columns,
  DEFAULT_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
  type ColumnType,
} from "../../stores/columns";

const COLUMN_TITLES: Record<ColumnType, string> = {
  home: "timeline.home",
  public: "timeline.public",
  notifications: "notifications.title",
  mentions: "notifications.mentions",
};

interface ColumnProps {
  id: string;
  type: ColumnType;
  index: number;
  children: JSX.Element;
}

export default function Column(props: ColumnProps) {
  const { t } = useI18n();
  const [dragOver, setDragOver] = createSignal(false);
  const [resizing, setResizing] = createSignal(false);

  const width = () => {
    const col = columns().find((c) => c.id === props.id);
    return col?.width ?? DEFAULT_WIDTH;
  };

  // --- Drag to reorder ---
  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer!.effectAllowed = "move";
    e.dataTransfer!.setData("text/plain", String(props.index));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const fromIdx = parseInt(e.dataTransfer!.getData("text/plain"), 10);
    if (!isNaN(fromIdx)) {
      reorderColumns(fromIdx, props.index);
    }
  };

  // --- Resize handle ---
  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startWidth = width();

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setColumnWidth(props.id, startWidth + delta);
    };

    const onUp = () => {
      setResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      class={`deck-column${dragOver() ? " deck-column-drag-over" : ""}`}
      style={{ width: `${width()}px`, "flex": `0 0 ${width()}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        class="deck-column-header"
        draggable={true}
        onDragStart={handleDragStart}
      >
        <span class="deck-column-title">
          {t(COLUMN_TITLES[props.type]) || props.type}
        </span>
        <div class="deck-column-actions">
          <button
            class="deck-column-btn deck-column-close"
            onClick={() => removeColumn(props.id)}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
      <div class="deck-column-content">{props.children}</div>
      <div
        class={`deck-column-resize${resizing() ? " active" : ""}`}
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
