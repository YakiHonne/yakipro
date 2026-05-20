import dynamic from "next/dynamic";
import Head from "next/head";

const YakiPoints = dynamic(() => import("@/PagesComponents/YakiPoints/YakiPoints"), {
  ssr: false,
});

export default function YakiPointsPage() {
  return (
    <>
      <Head>
        <title>Yaki Points</title>
        <meta
          name="description"
          content="Track your progress and achievements on the platform. Level up through engagement and quality contributions."
        />
      </Head>
      <YakiPoints />
    </>
  );
}
