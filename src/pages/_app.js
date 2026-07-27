import "@/styles/themes.css";
import "@/PagesComponents/Landing/landing.css";
import "@/PagesComponents/Login/login.css";
import "@/styles/globals.css";
import "@/styles/animation.css";
import "@/styles/breakpoints.css";
import "@/Components/UI/UI.css";
import "@/Components/Layout/Layout.css";
import "@/Components/Layout/TopNavbar.css";
import "@/Components/Orb/Orb.css";
import "katex/dist/katex.css";
import "@uiw/react-md-editor/markdown-editor.css";
import "@/styles/tiptap.css";
import "@/PagesComponents/Legal/legalDoc.css";
import "@/lib/i18n"; // side-effect: initialise i18next
import Layout from "@/Components/Layout/Layout";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import Head from "next/head";

import ReduxProvider from "@/Store/ReduxProvider";
import Publishing from "@/Components/Publishing";
import ToastMessages from "@/Components/ToastMessages";

const NO_LAYOUT_PAGES = new Set([
  "/login",
  "/404",
  "/",
  "/pricing",
  "/terms",
  "/privacy",
  "/refund-policy",
]);

function App({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize account logic
    import("@/Helpers/AccountInit").then((m) => m.initAppAccount());

    const handleStart = () => setLoading(true);
    const handleDone = () => setLoading(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleDone);
    router.events.on("routeChangeError", handleDone);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleDone);
      router.events.off("routeChangeError", handleDone);
    };
  }, [router]);

  return (
    <ReduxProvider>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        <Publishing />
        <ToastMessages />
        <Head>
          <title>YakiPro</title>
          <meta name="description" content="Decentralized social on Nostr" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" sizes="any" />
        </Head>

        {/* Route-change progress bar */}
        {loading && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "3px",
              zIndex: 999999,
              backgroundColor: "transparent",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                backgroundColor: "var(--color-primary-accent)",
                borderRadius: "4px",
              }}
              className="v-bounce"
            />
          </div>
        )}

        {/* Portal root for modals */}
        <div id="portal-root" />

        {NO_LAYOUT_PAGES.has(router.pathname) ? (
          <Component {...pageProps} />
        ) : (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        )}
      </ThemeProvider>
    </ReduxProvider>
  );
}

export default App;
