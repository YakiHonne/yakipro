import React from "react";
import Sidebar from "./Sidebar";
import { useRouter } from "next/router";

const NO_SIDEBAR_PAGES = new Set(["/login", "/404"]);

export default function Layout({ children }) {
  const router = useRouter();
  const shouldHideSidebar = NO_SIDEBAR_PAGES.has(router.pathname);

  return (
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
  );
}
