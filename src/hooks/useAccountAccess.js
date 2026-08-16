import { useSelector } from "react-redux";

export default function useAccountAccess() {
  const subscription = useSelector((state) => state.subscription);
  const nostrUser = useSelector((state) => state.nostrUser);

  const status = subscription?.status ?? null;
  const account = subscription?.account ?? null;

  const inTrial =
    account?.in_trial ?? status?.in_trial ?? nostrUser?.in_trial ?? false;
  const plan = status?.plan ?? nostrUser?.plan ?? "free";
  const active = status?.active ?? nostrUser?.active ?? false;

  const isFree = !inTrial && (!active || plan === "free");
  const isPaid = !inTrial && active && plan !== "free";
  const isPremium = !inTrial && active && plan === "premium";

  const username =
    account?.username || status?.username || nostrUser?.username || "";
  const onboarded =
    account?.onboarded ?? status?.onboarded ?? nostrUser?.onboarded ?? false;
  const trialUsed = account?.trial_used ?? status?.trial_used ?? false;
  const nip05 = account?.nip05 ?? status?.nip05 ?? null;
  const rawWallets = account?.wallets ?? status?.wallets ?? [];
  // wallets is a list of bare names, not full lightning addresses.
  const wallets = Array.isArray(rawWallets) ? rawWallets : [];

  return {
    plan,
    active,
    inTrial,
    isFree,
    isPaid,
    isPremium,
    hasAiAccess: !isFree,
    username,
    hasUsername: !!username,
    onboarded,
    trialUsed,
    nip05,
    nip05Name: nip05?.name || "",
    nip05Active: !!nip05?.is_active,
    hasNip05: !!nip05?.name && !!nip05?.is_active,
    wallets,
    walletAddress: wallets[0] || "",
    hasWallet: wallets.length > 0,
    loaded: subscription?.loaded ?? false,
    seeded: subscription?.accountSeeded ?? false,
  };
}
