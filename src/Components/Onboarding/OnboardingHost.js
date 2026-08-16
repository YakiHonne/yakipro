import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Onboarding from "./index";
import useAccountAccess from "@/hooks/useAccountAccess";

export default function OnboardingHost() {
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);
  const subscriptionLoaded = useSelector((state) => state.subscription?.loaded);
  const {
    isPaid,
    inTrial,
    trialUsed,
    onboarded,
    username,
    hasUsername,
    hasWallet,
    walletAddress,
    hasNip05,
    nip05Name,
  } = useAccountAccess();

  const [visible, setVisible] = useState(false);
  const shownForRef = useRef(null);

  const isComplete = hasUsername && hasNip05 && hasWallet;

  // Active-trial accounts are excluded because the claim endpoints reject them
  // with reason "trial"; trial_used marks a consumed trial, which is allowed.
  useEffect(() => {
    const pub = userKeys?.pub;
    if (!pub || !isConnected || !subscriptionLoaded) return;
    if (!isPaid || inTrial || !trialUsed) return;
    if (onboarded || isComplete) return;
    if (shownForRef.current === pub) return;

    shownForRef.current = pub;
    setVisible(true);
  }, [
    userKeys,
    isConnected,
    subscriptionLoaded,
    isPaid,
    inTrial,
    trialUsed,
    onboarded,
    isComplete,
  ]);

  if (!visible) return null;

  return (
    <Onboarding
      pubkey={userKeys?.pub}
      username={username}
      hasUsername={hasUsername}
      hasWallet={hasWallet}
      walletAddress={walletAddress}
      hasNip05={hasNip05}
      nip05Name={nip05Name}
      onClose={() => setVisible(false)}
    />
  );
}
