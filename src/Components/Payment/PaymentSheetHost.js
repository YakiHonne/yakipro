import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { PricingOverlay } from "@/Components/IsPremium";
import { closePaymentSheet } from "@/Store/Slices/PaymentSheet";

export default function PaymentSheetHost() {
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.isConnected);
  const subscription = useSelector((state) => state.subscription);
  const { open, trialEnded, dismissible } = useSelector(
    (state) => state.paymentSheet,
  );

  // IsPremium already renders the sheet for a blocked account or a forced
  // paywall; rendering a second copy on top of it would double the portal.
  const alreadyShown =
    subscription?.status?.access_blocked === true || subscription?.forcePaywall;

  if (!open || !isConnected || alreadyShown) return null;

  return (
    <PricingOverlay
      trialEnded={trialEnded}
      onBack={dismissible ? () => dispatch(closePaymentSheet()) : null}
    />
  );
}
