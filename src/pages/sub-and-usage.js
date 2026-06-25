import dynamic from "next/dynamic";
import Head from "next/head";

const SubAndUsage = dynamic(() => import("@/PagesComponents/SubAndUsage/SubAndUsage"), {
  ssr: false,
});

export default function SubAndUsagePage() {
  return (
    <>
      <Head>
        <title>Subscription &amp; Usage — YakiPro</title>
      </Head>
      <SubAndUsage />
    </>
  );
}
