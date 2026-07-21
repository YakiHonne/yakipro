import dynamic from "next/dynamic";

const Terms = dynamic(() => import("@/PagesComponents/Legal/Terms"), {
  ssr: false,
});

export default function TermsPage() {
  return <Terms />;
}
