import React, { useEffect } from "react";
import Sidebar from "./Sidebar";
import IsPremium from "@/Components/IsPremium";
import TrialBanner from "@/Components/TrialBanner";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";

const NO_SIDEBAR_PAGES = new Set(["/login", "/404", "/", "/pricing"]);

export default function Layout({ children }) {
  const router = useRouter();
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);
  const loadingConnectedUser = useSelector((state) => state.loadingConnectedUser);
  const shouldHideSidebar = NO_SIDEBAR_PAGES.has(router.pathname) || (!userKeys && !isConnected);

  useEffect(() => {
    if (loadingConnectedUser) return;
    if (!userKeys && !isConnected && !NO_SIDEBAR_PAGES.has(router.pathname)) {
      router.replace("/login");
    }
  }, [userKeys, isConnected, loadingConnectedUser, router]);

  if (loadingConnectedUser) {
    return (
      <div style={{ width: "100vw", height: "100dvh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="ip-spinner" />
      </div>
    );
  }

  return (
    <IsPremium>
      <TrialBanner />
      <div
        className="page-container fit-container fx-centered fx-start-v"
        style={{ height: "100dvh" }}
      >
        <div className="main-container">
          <main className="fit-container fx-centered fx-end-h fx-start-v">
            <div
              className="fx-scattered fx-start-v box-pad-h-s fit-container"
              style={{ gap: 0 }}
            >
              {!shouldHideSidebar && <Sidebar />}

              <div
                className="main-page-nostr-container"
                style={{ flex: 1, position: "relative" }}
              >
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </IsPremium>
  );
}
