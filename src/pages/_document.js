import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html dir="auto" suppressHydrationWarning>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
        {/*
          Runs before first paint so `data-theme` is already correct when the CSS
          applies. Without this the page painted with the :root (light) token block
          regardless of the user's real preference, then snapped to the right theme
          after hydration — the "screwed light mode" on a first visit.
          Mirrors next-themes' own storage key and value resolution.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var e=localStorage.getItem("theme");if(!e||e==="system"){e=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",e);document.documentElement.style.colorScheme=["dark","gray","dark-gray"].indexOf(e)>-1?"dark":"light"}catch(t){document.documentElement.setAttribute("data-theme","dark")}})();`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
