import { Show } from "solid-js";
import { useI18n } from "@nekonoverse/ui/i18n";
import {
  theme,
  setTheme,
  fontSize,
  setFontSize,
  type Theme,
  type FontSize,
} from "@nekonoverse/ui/stores/theme";

const THEMES: { key: Theme; label: string }[] = [
  { key: "dark", label: "Dark" },
  { key: "light", label: "Light" },
  { key: "novel", label: "Novel" },
];

const FONT_SIZES: { key: FontSize; label: string }[] = [
  { key: "small", label: "S" },
  { key: "medium", label: "M" },
  { key: "large", label: "L" },
  { key: "xlarge", label: "XL" },
  { key: "xxlarge", label: "2XL" },
];

interface Props {
  onClose: () => void;
}

export default function SettingsPanel(props: Props) {
  const { t } = useI18n();

  return (
    <div class="settings-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) props.onClose();
    }}>
      <div class="settings-panel">
        <div class="settings-header">
          <span class="settings-title">{t("settings.title") || "Settings"}</span>
          <button class="settings-close" onClick={props.onClose}>×</button>
        </div>

        <div class="settings-section">
          <label class="settings-label">{t("settings.theme") || "Theme"}</label>
          <div class="settings-btn-group">
            {THEMES.map((th) => (
              <button
                class={`settings-btn${theme() === th.key ? " active" : ""}`}
                onClick={() => setTheme(th.key)}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        <div class="settings-section">
          <label class="settings-label">{t("settings.fontSize") || "Font Size"}</label>
          <div class="settings-btn-group">
            {FONT_SIZES.map((fs) => (
              <button
                class={`settings-btn${fontSize() === fs.key ? " active" : ""}`}
                onClick={() => setFontSize(fs.key)}
              >
                {fs.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
