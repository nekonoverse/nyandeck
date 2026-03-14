import { useI18n } from "@nekonoverse/ui/i18n";
import { addColumn, type ColumnType } from "../../stores/columns";

const COLUMN_OPTIONS: { type: ColumnType; labelKey: string }[] = [
  { type: "home", labelKey: "timeline.home" },
  { type: "notifications", labelKey: "notifications.title" },
  { type: "public", labelKey: "timeline.public" },
];

export default function AddColumnPanel() {
  const { t } = useI18n();

  return (
    <div class="deck-add-panel">
      <div class="deck-add-label">+</div>
      {COLUMN_OPTIONS.map((opt) => (
        <button
          class="deck-add-btn"
          onClick={() => addColumn(opt.type)}
          title={t(opt.labelKey)}
        >
          {opt.type === "home" ? "H" : opt.type === "notifications" ? "N" : "P"}
        </button>
      ))}
    </div>
  );
}
