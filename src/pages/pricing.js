import dynamic from "next/dynamic";

const LandingPricing = dynamic(
  () => import("@/PagesComponents/Landing/LandingPricing"),
  { ssr: false }
);

export default function PricingPage() {
  return <LandingPricing />;
}
