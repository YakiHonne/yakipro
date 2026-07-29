import { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { getUsage } from "@/Endpoionts/subscription";

export default function useUsage() {
  const pubkey = useSelector((state) => state.userKeys?.pub ?? null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Keyed on the pubkey so an account switch changes `fetch`'s identity, which re-runs the
  // consuming page's `useEffect(() => fetch(), [fetch])` against the new account.
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getUsage();
      setUsage(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [pubkey]);

  // Clear the outgoing account's usage so it isn't rendered under the new account
  // while the refetch is in flight.
  useEffect(() => {
    setUsage(null);
    setError(false);
    setLoading(true);
  }, [pubkey]);

  return { usage, loading, error, fetch };
}
