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
        <div className="fit-container">
          <h1>{t("AVG3Uga")}</h1>
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
