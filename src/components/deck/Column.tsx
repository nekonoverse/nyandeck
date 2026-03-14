import type { JSX } from "solid-js";
import { useI18n } from "@nekonoverse/ui/i18n";
import { removeColumn, moveColumn, type ColumnType } from "../../stores/columns";

const COLUMN_TITLES: Record<ColumnType, string> = {
  home: "timeline.home",
  public: "timeline.public",
  notifications: "notifications.title",
};

interface ColumnProps {
  id: string;
  type: ColumnType;
  children: JSX.Element;
}

export default function Column(props: ColumnProps) {
  const { t } = useI18n();

  return (
    <div class="deck-column">
      <div class="deck-column-header">
        <span class="deck-column-title">{t(COLUMN_TITLES[props.type])}</span>
        <div class="deck-column-actions">
          <button
            class="deck-column-btn"
            onClick={() => moveColumn(props.id, -1)}
            title="←"
          >
            ←
          </button>
          <button
            class="deck-column-btn"
            onClick={() => moveColumn(props.id, 1)}
            title="→"
          >
            →
          </button>
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
    </div>
  );
}
