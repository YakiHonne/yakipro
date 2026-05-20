import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import dynamic from "next/dynamic";
import { Tabs } from "@/Components/UI/Tabs";
import KeysSection from "./KeysSection";
import PagePlaceholder from "@/Components/PlaceholderScreens/PagePlaceholder";
import { pphValues } from "@/Content/PagesPlaceholdersValues";
import { SelectTabs } from "@/Components/SelectTabs";

const SubscriptionSection = dynamic(() => import("./SubscriptionSection"), {
  ssr: false,
});

const TAB_KEYS = ["keys", "subscription"];
const TAB_LABELS = ["Keys", "Subscription"];

export default function Settings() {
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);

  const [selectedTab, setSelectedTab] = useState(0);

  // Sync with URL hash on mount and hash change
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      const idx = TAB_KEYS.indexOf(hash);
      if (idx !== -1) setSelectedTab(idx);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (idx) => {
    setSelectedTab(idx);
    window.history.replaceState(null, "", `#${TAB_KEYS[idx]}`);
  };

  if (!isConnected || !userKeys) {
    return <PagePlaceholder name={pphValues.NOT_CONNECTED} />;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        overflowY: "scroll",
        padding: "24px 0",
      }}
      className="no-scrollbar"
    >
      <div className="fit-container fx-centered fx-start-h">
        <div className="fit-container" style={{ padding: "0 16px" }}>
          <div
            className="fx-centered fx-col fit-container"
            style={{ rowGap: "20px" }}
          >
            {/* Page header */}
            <div
              className="fit-container fx-centered fx-col fx-start-v"
              style={{ rowGap: "4px" }}
            >
              <h2>Settings</h2>
              <p className="p-secondary-c">
                Manage your account keys and subscription.
              </p>
            </div>

            {/* Tab switcher */}
            <div className="fit-container fx-centered fx-start-h">
              <SelectTabs
                selectedTab={selectedTab}
                setSelectedTab={handleTabChange}
                tabs={TAB_LABELS}
              />
            </div>

            {/* Tab panels */}
            {selectedTab === 0 && <KeysSection />}
            {selectedTab === 1 && <SubscriptionSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
