import dynamic from "next/dynamic";

const LandingHome = dynamic(
  () => import("@/PagesComponents/Landing/LandingHome"),
  { ssr: false }
);

export default function IndexPage() {
  return <LandingHome />;
}
