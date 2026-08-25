import React, { useState } from "react";
import Icon from "@/Components/LucideIcon";
import { useTranslation } from "react-i18next";
import IsUserOnline from "@/Components/IsUserOnline";
import { SelectTabs } from "@/Components/SelectTabs";
import useSubscriptionRefresh from "@/hooks/useSubscriptionRefresh";
import SubPlansTab from "../SubPlans/SubPlansTab";
import SubManagementTab from "../SubManagement/SubManagementTab";

export default function Subscription() {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState(0);
  // Bumped by the info button; SubManagementTab reopens the tour on each bump.
  const [tourNonce, setTourNonce] = useState(0);

  // Landing here from a checkout redirect (success_url = /subscription) or
  // returning to this tab pulls fresh server subscription/session state so the
  // UI reflects a just-completed payment without a manual reconnect.
  useSubscriptionRefresh();

  return (
    <IsUserOnline>
      <div className="fit-container box-pad-h-m box-pad-v-m fx-gap-v-m fx-col no-scrollbar">
        <div className="fit-container fx-col" style={{ gap: "0.35rem" }}>
          <h1 style={{ margin: 0 }}>{t("AVG3Uga")}</h1>
          <p className="p-secondary-c" style={{ margin: 0, maxWidth: "68ch" }}>
            {t("ARJICtS")}
          </p>
        </div>

        <div className="fx-centered fx-start-h fit-container fx-gap-h">
          <div>
            <SelectTabs
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
              tabs={["Plans", "Manage subs"]}
            />
          </div>

          {/* Reopens the tour on demand. Sits outside the tab control so it
              never reads as a third tab, and only while Manage subs is the
              active tab, since that is all it explains. */}
          {selectedTab === 1 && (
            <button
              aria-label="What is this?"
              title="What is this?"
              onClick={() => setTourNonce((n) => n + 1)}
              className="fx-centered pointer"
              style={{
                background: "transparent",
                border: "none",
                padding: "4px",
                lineHeight: 0,
                color: "var(--color-primary-text)",
                // Explicit: a <button> carries a UA default of cursor:default
                // which beats the .pointer class on some engines.
                cursor: "pointer",
              }}
            >
              <Icon name="info" size={24} />
            </button>
          )}
        </div>

        {selectedTab === 0 ? (
          <SubPlansTab />
        ) : (
          <SubManagementTab tourNonce={tourNonce} />
        )}
      </div>
    </IsUserOnline>
  );
}
