import dynamic from "next/dynamic";
import Head from "next/head";

const TermsApp = dynamic(() => import("@/PagesComponents/Legal/TermsApp"), {
  ssr: false,
});

export default function TermsAppPage() {
  return (
    <>
      <Head>
        {/* Unlisted: reachable by direct URL, kept out of search results. */}
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <TermsApp />
    </>
  );
}
