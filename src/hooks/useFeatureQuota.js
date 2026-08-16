import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getUsage } from "@/Endpoionts/subscription";

export const QUOTA_FEATURES = {
  chatArticles: "chat-articles",
  secondReader: "second-reader",
  energyMapper: "energy-mapper",
};

const UNLIMITED = -1;

const readFeature = (payload, feature) => {
  const entry = payload?.usage?.[feature];
  if (!entry) return null;

  const limit = entry.limit ?? 0;
  const used = entry.used ?? 0;

  return {
    limit,
    used,
    resetAt: entry.reset_at ?? null,
    label: entry.label ?? "",
    unlimited: limit === UNLIMITED,
    noAccess: limit === 0,
    exhausted: limit === 0 || (limit !== UNLIMITED && used >= limit),
    remaining: limit === UNLIMITED ? Infinity : Math.max(0, limit - used),
  };
};

// Reads /api/v1/usage once per account and derives per-feature exhaustion.
// `features` is a list of usage keys so a surface depending on two quotas
// (Second Reader's "Fix with AI" also spends chat-articles) tracks both from a
// single request.
export default function useFeatureQuota(features) {
  const pubkey = useSelector((state) => state.userKeys?.pub ?? null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const featuresKey = Array.isArray(features)
    ? features.join(",")
    : String(features || "");

  const refresh = useCallback(async () => {
    if (!pubkey) {
      setPayload(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await getUsage();
      setPayload(data);
      return data;
    } catch {
      setPayload(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [pubkey]);

  // Keyed to the pubkey with a cancelled flag so a slow read issued for the
  // previous account cannot land after a switch.
  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setLoading(true);

    if (!pubkey) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    getUsage()
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) setPayload(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pubkey]);

  const list = Array.isArray(features) ? features : [features];
  const quotas = {};
  for (const feature of list) {
    if (feature) quotas[feature] = readFeature(payload, feature);
  }

  return {
    quotas,
    inTrial: payload?.in_trial ?? false,
    usagePlan: payload?.usage_plan ?? null,
    plan: payload?.plan ?? null,
    loading,
    refresh,
    featuresKey,
  };
}
