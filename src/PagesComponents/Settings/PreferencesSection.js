import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { supportedLanguage } from "@/Content/SupportedLanguages";
import Select from "@/Components/UI/Select";

export default function PreferencesSection() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const currentLang = i18n.resolvedLanguage || i18n.language || "en";

  const themeOptions = [
    { value: "light", display_name: t("APref04") },
    { value: "dark", display_name: t("APref05") },
    { value: "system", display_name: t("APref06") },
  ];

  return (
    <div className="yp-card box-pad-h-m fx-centered fx-col">

      {/* Language row */}
      <div className="fit-container fx-scattered box-pad-v-m">
        <p className="p-secondary-c">{t("APref02")}</p>
        <Select
          options={supportedLanguage}
          value={currentLang}
          onChange={(val) => i18n.changeLanguage(val)}
          isColoredIcons={true}
        />
      </div>

      <div className="fit-container border-top" />

      {/* Appearance row */}
      <div className="fit-container fx-scattered box-pad-v-m">
        <p className="p-secondary-c">{t("APref03")}</p>
        <Select
          options={themeOptions}
          value={theme}
          onChange={setTheme}
        />
      </div>

    </div>
  );
}
