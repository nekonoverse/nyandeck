import { Show } from "solid-js";
import { useI18n, type Locale } from "@nekonoverse/ui/i18n";
import {
  theme,
  setTheme,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  customFontFamily,
  setCustomFontFamily,
  timeFormat,
  setTimeFormat,
  cursorStyle,
  setCursorStyle,
  wideEmojiStyle,
  setWideEmojiStyle,
  inputMode,
  setInputMode,
  nyaizeEnabled,
  setNyaizeEnabled,
  reduceMfmMotion,
  setReduceMfmMotion,
  cropShadow,
  setCropShadow,
  FONT_FAMILY_MAP,
  type Theme,
  type FontSize,
  type FontFamily,
  type TimeFormat,
  type CursorStyle,
  type WideEmojiStyle,
  type InputMode,
} from "@nekonoverse/ui/stores/theme";

const LOCALES = [
  { code: "ja", name: "日本語" },
  { code: "en", name: "English" },
  { code: "neko", name: "にゃんご" },
];

interface Props {
  onClose: () => void;
}

export default function SettingsPanel(props: Props) {
  const { t, locale, setLocale } = useI18n();

  return (
    <div class="settings-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) props.onClose();
    }}>
      <div class="settings-panel">
        <div class="settings-header">
          <span class="settings-title">{t("settings.title")}</span>
          <button class="settings-close" onClick={props.onClose}>×</button>
        </div>

        <div class="settings-body">
          {/* Language */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.language")}</label>
            <div class="settings-btn-group">
              {LOCALES.map((item) => (
                <button
                  class={`settings-btn${locale() === item.code ? " active" : ""}`}
                  onClick={() => setLocale(item.code as Locale)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.theme")}</label>
            <div class="settings-btn-group">
              {([
                { key: "dark" as Theme, label: t("settings.themeDark") },
                { key: "light" as Theme, label: t("settings.themeLight") },
                { key: "novel" as Theme, label: t("settings.themeNovel") },
              ]).map((item) => (
                <button
                  class={`settings-btn${theme() === item.key ? " active" : ""}`}
                  onClick={() => setTheme(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.fontSize")}</label>
            <div class="settings-btn-group">
              {([
                { key: "small" as FontSize, size: "14px" },
                { key: "medium" as FontSize, size: "16px" },
                { key: "large" as FontSize, size: "20px" },
                { key: "xlarge" as FontSize, size: "24px" },
                { key: "xxlarge" as FontSize, size: "28px" },
              ]).map((item) => (
                <button
                  class={`settings-btn${fontSize() === item.key ? " active" : ""}`}
                  style={{ "font-size": item.size }}
                  onClick={() => setFontSize(item.key)}
                >
                  {t("settings.fontSample" as any)}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.fontFamily")}</label>
            <div class="settings-btn-group settings-btn-group-wrap">
              {([
                { key: "noto" as FontFamily, label: t("settings.fontNoto"), css: FONT_FAMILY_MAP.noto },
                { key: "hiragino" as FontFamily, label: t("settings.fontHiragino"), css: FONT_FAMILY_MAP.hiragino },
                { key: "yu-mac" as FontFamily, label: t("settings.fontYuMac"), css: FONT_FAMILY_MAP["yu-mac"] },
                { key: "yu-win" as FontFamily, label: t("settings.fontYuWin"), css: FONT_FAMILY_MAP["yu-win"] },
                { key: "meiryo" as FontFamily, label: t("settings.fontMeiryo"), css: FONT_FAMILY_MAP.meiryo },
                { key: "ipa" as FontFamily, label: t("settings.fontIPA"), css: FONT_FAMILY_MAP.ipa },
                { key: "system" as FontFamily, label: t("settings.fontSystem"), css: FONT_FAMILY_MAP.system },
                { key: "custom" as FontFamily, label: t("settings.fontCustom"), css: undefined },
              ]).map((item) => (
                <button
                  class={`settings-btn${fontFamily() === item.key ? " active" : ""}`}
                  style={item.css ? { "font-family": item.css } : {}}
                  onClick={() => setFontFamily(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Show when={fontFamily() === "custom"}>
              <input
                type="text"
                class="settings-input"
                placeholder={t("settings.fontCustomPlaceholder")}
                value={customFontFamily()}
                onInput={(e) => setCustomFontFamily(e.currentTarget.value)}
                style={{ "font-family": customFontFamily() || "inherit" }}
              />
              <p class="settings-desc">{t("settings.fontCustomHint")}</p>
            </Show>
          </div>

          {/* Time Format */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.timeFormat" as any)}</label>
            <div class="settings-btn-group">
              {([
                { key: "absolute" as TimeFormat, label: t("settings.timeAbsolute" as any) },
                { key: "relative" as TimeFormat, label: t("settings.timeRelative" as any) },
                { key: "combined" as TimeFormat, label: t("settings.timeCombined" as any) },
                { key: "unixtime" as TimeFormat, label: t("settings.timeUnixtime" as any) },
              ]).map((item) => (
                <button
                  class={`settings-btn${timeFormat() === item.key ? " active" : ""}`}
                  onClick={() => setTimeFormat(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cursor Style */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.cursorStyle" as any)}</label>
            <div class="settings-btn-group">
              {([
                { key: "default" as CursorStyle, label: t("settings.cursorDefault" as any) },
                { key: "paw" as CursorStyle, label: t("settings.cursorPaw" as any) },
              ]).map((item) => (
                <button
                  class={`settings-btn${cursorStyle() === item.key ? " active" : ""}`}
                  onClick={() => setCursorStyle(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wide Emoji */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.wideEmoji" as any)}</label>
            <div class="settings-btn-group">
              {([
                { key: "shrink" as WideEmojiStyle, label: t("settings.wideEmojiShrink" as any) },
                { key: "blur" as WideEmojiStyle, label: t("settings.wideEmojiBlur" as any) },
                { key: "overflow" as WideEmojiStyle, label: t("settings.wideEmojiOverflow" as any) },
              ]).map((item) => (
                <button
                  class={`settings-btn${wideEmojiStyle() === item.key ? " active" : ""}`}
                  onClick={() => setWideEmojiStyle(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Mode */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.inputMode" as any)}</label>
            <div class="settings-btn-group">
              {([
                { key: "auto" as InputMode, label: t("settings.inputModeAuto" as any) },
                { key: "touch" as InputMode, label: t("settings.inputModeTouch" as any) },
                { key: "pc" as InputMode, label: t("settings.inputModePc" as any) },
              ]).map((item) => (
                <button
                  class={`settings-btn${(inputMode() ?? "auto") === item.key ? " active" : ""}`}
                  onClick={() => setInputMode(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reaction Confirm */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.reactionConfirm" as any)}</label>
            <p class="settings-desc">{t("settings.reactionConfirmDesc" as any)}</p>
            <button
              class="settings-btn"
              onClick={() => localStorage.removeItem("hideReactionConfirm")}
            >
              {t("settings.reactionConfirmReset" as any)}
            </button>
          </div>

          {/* MFM Motion */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.mfmMotion" as any)}</label>
            <label class="settings-toggle">
              <input
                type="checkbox"
                checked={reduceMfmMotion()}
                onChange={(e) => setReduceMfmMotion(e.currentTarget.checked)}
              />
              {t("settings.reduceMfmMotion" as any)}
            </label>
          </div>

          {/* Media Display */}
          <div class="settings-section">
            <label class="settings-label">{t("settings.mediaDisplay" as any)}</label>
            <label class="settings-toggle">
              <input
                type="checkbox"
                checked={cropShadow()}
                onChange={(e) => setCropShadow(e.currentTarget.checked)}
              />
              {t("settings.cropShadow" as any)}
            </label>
          </div>

          {/* Nyaize */}
          <div class="settings-section">
            <label class="settings-toggle">
              <input
                type="checkbox"
                checked={nyaizeEnabled()}
                onChange={(e) => setNyaizeEnabled(e.currentTarget.checked)}
              />
              {t("settings.nyaize")}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
