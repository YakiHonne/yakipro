import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { openPaymentSheet } from "@/Store/Slices/PaymentSheet";
import { setToast } from "@/Store/Slices/Extras";
import {
  isAccessFailure,
  isQuotaExceeded,
  isTrialBlocked,
  isUpgradeRequired,
} from "@/Helpers/ApiError";
import useAccountAccess from "./useAccountAccess";

export default function useAccessFailure() {
  const dispatch = useDispatch();
  const { isFree, inTrial } = useAccountAccess();

  // A free account can always be converted by the sheet. A trial account hitting
  // reason "trial" is being told to buy a real plan, so the sheet applies there
  // too — but a paying account that merely ran out of quota can only wait for the
  // reset, and showing it a pricing sheet would be a dead end.
  const handleAccessFailure = useCallback(
    (err, { source = "", autoOpen = true } = {}) => {
      if (!isAccessFailure(err)) return false;

      const trialBlocked = isTrialBlocked(err);
      const shouldUpgrade = isFree || trialBlocked || (inTrial && isUpgradeRequired(err));

      if (shouldUpgrade) {
        if (autoOpen) dispatch(openPaymentSheet({ source }));
        return true;
      }

      dispatch(
        setToast({
          type: 2,
          desc: isQuotaExceeded(err)
            ? err?.message || "You have reached your limit for this feature."
            : err?.message || "This action is not available on your plan.",
        }),
      );
      return true;
    },
    [dispatch, isFree, inTrial],
  );

  const showPaymentSheet = useCallback(
    (source = "") => dispatch(openPaymentSheet({ source })),
    [dispatch],
  );

  return { handleAccessFailure, showPaymentSheet };
}
