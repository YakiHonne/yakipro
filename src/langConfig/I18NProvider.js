"use client";

import { I18nextProvider } from "react-i18next";
import i18n from "@/langConfig/i18n";
import { Suspense } from "react";

export default function I18NProvider({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense>{children}</Suspense>
    </I18nextProvider>
  );
}
