import Head from "next/head";
import dynamic from "next/dynamic";

const MobileAppRedirection = dynamic(
  () => import("@/Components/MobileAppRedirection"),
  { ssr: false },
);

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://pro.yakihonne.com"
).replace(/\/$/, "");

const TITLE = "YakiPro Mobile App";
const DESCRIPTION =
  "Download YakiPro for iOS & iPadOS, Android (phones & tablets), and macOS.";
const IMAGE = `${SITE_URL}/thumbnail-yaki-pro.png`;

export default function YakiProMobileAppLinks() {
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/yakipro-mobile-app-links`} />
        <meta property="og:image" content={IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={IMAGE} />
      </Head>
      <MobileAppRedirection />
    </>
  );
}
