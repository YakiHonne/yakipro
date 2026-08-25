import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import dynamic from "next/dynamic";
import RelaysList from "./RelaysList";
import SubscribersList from "./SubscribersList";
import { hasSeenSubTour, markSubTourSeen } from "./subTourStorage";

// The tour is a first-visit overlay, so it must not be in the initial bundle
// or run during SSR -- the illustrations are a large block of inline SVG.
const SubTourOverlay = dynamic(() => import("./SubTourOverlay"), { ssr: false });

export default function SubManagementTab({ tourNonce = 0 }) {
  const currentPubkey = useSelector((state) => state.userKeys?.pub ?? null);
  const [showTour, setShowTour] = useState(false);

  // Auto-open on the first ever visit to this tab, once the pubkey is known so
  // the flag is read against the right account.
  useEffect(() => {
    if (!hasSeenSubTour(currentPubkey)) setShowTour(true);
  }, [currentPubkey]);

  // Reopening from the info button. Guarded on > 0 so the initial render does
  // not count as a request to open.
  useEffect(() => {
    if (tourNonce > 0) setShowTour(true);
  }, [tourNonce]);

  // Skipping and finishing are the same outcome: never auto-open again.
  const closeTour = () => {
    markSubTourSeen(currentPubkey);
    setShowTour(false);
  };

  return (
    <>
      {showTour && <SubTourOverlay onClose={closeTour} />}
      <RelaysList />
      <SubscribersList />
    </>
  );
}
