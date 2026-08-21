import dynamic from "next/dynamic";
import Head from "next/head";

const ChildSafety = dynamic(
  () => import("@/PagesComponents/Legal/ChildSafety"),
  { ssr: false },
);

export default function ChildSafetyPage() {
  return (
    <>
      <Head>
        {/* Unlisted: reachable by direct URL, kept out of search results. */}
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <ChildSafety />
    </>
  );
}
