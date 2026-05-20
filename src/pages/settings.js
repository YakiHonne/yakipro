import dynamic from "next/dynamic";
import Head from "next/head";

const Settings = dynamic(() => import("@/PagesComponents/Settings/Settings"), {
  ssr: false,
});

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Settings — YakiPro</title>
      </Head>
      <Settings />
    </>
  );
}
