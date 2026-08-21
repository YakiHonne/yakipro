import React, { useEffect } from "react";
import TopNavbar from "./TopNavbar";
import IsPremium from "@/Components/IsPremium";
import TrialBanner from "@/Components/TrialBanner";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import Spinner from "../Spinner";

const NO_NAVBAR_PAGES = new Set([
  "/login",
  "/404",
  "/",
  "/pricing",
  "/terms",
  "/terms-app",
  "/privacy",
  "/refund-policy",
]);

export default function Layout({ children }) {
  const router = useRouter();
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);
  const loadingConnectedUser = useSelector((state) => state.loadingConnectedUser);
  const shouldHideNavbar = NO_NAVBAR_PAGES.has(router.pathname) || (!userKeys && !isConnected);

  useEffect(() => {
    if (loadingConnectedUser) return;
    if (!userKeys && !isConnected && !NO_NAVBAR_PAGES.has(router.pathname)) {
      router.replace("/login");
    }
  }, [userKeys, isConnected, loadingConnectedUser, router]);

  if (loadingConnectedUser) {
    return (
      <div style={{ width: "100vw", height: "100dvh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* <div className="ip-spinner" /> */}
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <IsPremium>
      {!shouldHideNavbar && <TopNavbar />}
      <TrialBanner />
      <div
        className={`page-container fit-container fx-centered fx-start-v${!shouldHideNavbar ? " uplift-page-offset" : ""}`}
      // style={{ height: "100dvh" }}
      >
        <div className="main-container">
          <main className="fit-container fx-centered fx-end-h fx-start-v">
            <div className="main-page-nostr-container fit-container" style={{ position: "relative" }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </IsPremium>
  );
}
