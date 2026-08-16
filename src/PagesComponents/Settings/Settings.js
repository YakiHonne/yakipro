import React from "react";
import { useSelector } from "react-redux";
import KeysSection from "./KeysSection";
import PreferencesSection from "./PreferencesSection";
import PagePlaceholder from "@/Components/PlaceholderScreens/PagePlaceholder";
import { pphValues } from "@/Content/PagesPlaceholdersValues";

export default function Settings() {
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);

  if (!isConnected || !userKeys) {
    return <PagePlaceholder name={pphValues.NOT_CONNECTED} />;
  }

  return (
    <div
      style={{
        width: "100%",
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
                Manage your account settings.
              </p>
            </div>

            <div
              className="fx-centered fx-col fit-container"
              style={{ rowGap: "32px" }}
            >
              <div
                className="fx-centered fx-col fit-container"
                style={{ rowGap: "16px" }}
              >
                <div className="fit-container border-bottom" style={{ paddingBottom: "8px" }}>
                  <h4>Keys</h4>
                </div>
                <KeysSection />
              </div>
              <div
                className="fx-centered fx-col fit-container"
                style={{ rowGap: "16px" }}
              >
                <div className="fit-container border-bottom" style={{ paddingBottom: "8px" }}>
                  <h4>Preferences</h4>
                </div>
                <PreferencesSection />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
