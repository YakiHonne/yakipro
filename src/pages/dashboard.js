import dynamic from "next/dynamic";

const Analytics = dynamic(
  () => import("@/PagesComponents/Analytics/Analytics"),
  { ssr: false },
);

export default function DashboardPage() {
  return <Analytics />;
}
