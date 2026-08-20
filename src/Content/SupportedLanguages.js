const supportedLanguageKeys = [
  "en",
  "zh",
  "fr",
  "es",
  "it",
  "pt",
  "th",
  "ja",
  "ar",
  "ru",
  "hi",
  "hu",
];

const LanguageFlag = ({ flag }) => (
  <span
    style={{
      fontSize: "1.1rem",
      lineHeight: 1,
      minWidth: "1.35rem",
      textAlign: "center",
    }}
  >
    {flag}
  </span>
);

const appLanguages = [
  { display_name: "English", value: "en", flag: "🇬🇧" },
  { display_name: "中文", value: "zh", flag: "🇨🇳" },
  { display_name: "العربية", value: "ar", flag: "🇸🇦" },
  { display_name: "Español", value: "es", flag: "🇪🇸" },
  { display_name: "Português", value: "pt", flag: "🇵🇹" },
  { display_name: "Italiano", value: "it", flag: "🇮🇹" },
  { display_name: "Français", value: "fr", flag: "🇫🇷" },
  { display_name: "ไทย", value: "th", flag: "🇹🇭" },
  { display_name: "日本語", value: "ja", flag: "🇯🇵" },
  { display_name: "भारतीय", value: "hi", flag: "🇮🇳" },
  { display_name: "Русский", value: "ru", flag: "🇷🇺" },
  { display_name: "Magyar", value: "hu", flag: "🇭🇺" },
];

const supportedLanguage = appLanguages.map((lang) => ({
  display_name: lang.display_name,
  value: lang.value,
  left_el: <LanguageFlag flag={lang.flag} />,
  disabled: false,
}));

export { supportedLanguage, supportedLanguageKeys };
