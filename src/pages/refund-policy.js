import dynamic from "next/dynamic";

const RefundPolicy = dynamic(
  () => import("@/PagesComponents/Legal/RefundPolicy"),
  { ssr: false }
);

export default function RefundPolicyPage() {
  return <RefundPolicy />;
}
