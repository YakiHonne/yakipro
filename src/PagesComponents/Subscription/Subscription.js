import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import IsUserOnline from "@/Components/IsUserOnline";
import { SelectTabs } from "@/Components/SelectTabs";
import useSubscriptionRefresh from "@/hooks/useSubscriptionRefresh";
import SubPlansTab from "../SubPlans/SubPlansTab";
import SubManagementTab from "../SubManagement/SubManagementTab";

export default function Subscription() {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState(0);

  // Landing here from a checkout redirect (success_url = /subscription) or
  // returning to this tab pulls fresh server subscription/session state so the
  // UI reflects a just-completed payment without a manual reconnect.
  useSubscriptionRefresh();

  return (
    <IsUserOnline>
      <div
        className="fit-container box-pad-h-m box-pad-v-m fx-gap-v-m fx-col no-scrollbar"
        style={{ height: "100dvh", overflow: "scroll" }}
      >
        <div className="fit-container fx-col" style={{ gap: "0.35rem" }}>
          <h1 style={{ margin: 0 }}>{t("AVG3Uga")}</h1>
          <p className="p-secondary-c" style={{ margin: 0, maxWidth: "68ch" }}>
            {t("ARJICtS")}
          </p>
        </div>

        <div className="fx-centered fx-start-h fit-container" style={{ maxWidth: "320px" }}>
          <div>
            <SelectTabs
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
              tabs={["Plans", "Manage subs"]}
            />
          </div>
        </div>

        {selectedTab === 0 ? <SubPlansTab /> : <SubManagementTab />}
      </div>
    </IsUserOnline>
  );
}
