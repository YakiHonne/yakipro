import { useSelector } from "react-redux";
import AnalyticsProvider from "./AnalyticsProvider";
import OnboardingSync from "./OnboardingSync";
import DashboardLayout from "./DashboardLayout";

export default function Analytics() {
  const userKeys = useSelector((state) => state.userKeys);
  const pubkey = userKeys?.pub;

  if (!pubkey) {
    return (
      <div
        className="fit-container fx-centered"
        style={{ minHeight: "60vh", color: "var(--color-text-secondary)" }}
      >
        Please log in to view your analytics.
      </div>
    );
  }

  return (
    <AnalyticsProvider pubkey={pubkey}>
      <OnboardingSync />
      <DashboardLayout pubkey={pubkey} />
    </AnalyticsProvider>
  );
}
