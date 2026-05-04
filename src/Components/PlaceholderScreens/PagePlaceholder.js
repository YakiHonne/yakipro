"use client";

import { pphValues } from "@/Content/PagesPlaceholdersValues";
import Illustration from "@/Components/Illustration";
import { useTranslation } from "react-i18next";

function PlaceholderShell({ illustrationName, titleKey, descKey, height, children }) {
  const { t } = useTranslation();
  return (
    <div className="fit-container fx-centered" style={{ minHeight: height }}>
      <div className="min-width-600 fx-centered fx-col fx-gap-v-m">
        <Illustration name={illustrationName} size={260} />
        <h2 className="p-centered">{t(titleKey)}</h2>
        <p className="p-secondary-c p-centered">{t(descKey)}</p>
        {children}
      </div>
    </div>
  );
}

export default function PagePlaceholder({ name, height = "80vh", data }) {
  switch (name) {
    case pphValues.NOT_CONNECTED:
      return (
        <PlaceholderShell
          illustrationName="not-connected"
          titleKey="common.notConnected"
          descKey="auth.connectWithKey"
          height={height}
        />
      );
    case pphValues.EMPTY_FEED:
      return (
        <PlaceholderShell
          illustrationName="empty-feed"
          titleKey="common.emptyFeed"
          descKey="common.noContent"
          height={height}
        />
      );
    case pphValues.NO_CONTENT:
    case pphValues.NO_POSTS:
      return (
        <PlaceholderShell
          illustrationName="no-content"
          titleKey="common.noContent"
          descKey="common.noContent"
          height={height}
        />
      );
    case pphValues.NOT_FOUND:
      return (
        <PlaceholderShell
          illustrationName="404"
          titleKey="common.error"
          descKey="common.retry"
          height={height}
        />
      );
    case pphValues.COMING_SOON:
      return (
        <PlaceholderShell
          illustrationName="coming-soon"
          titleKey="common.comingSoon"
          descKey="common.noContent"
          height={height}
        />
      );
    default:
      return null;
  }
}
