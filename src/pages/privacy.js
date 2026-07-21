import dynamic from "next/dynamic";

const Privacy = dynamic(() => import("@/PagesComponents/Legal/Privacy"), {
  ssr: false,
});

export default function PrivacyPage() {
  return <Privacy />;
}
