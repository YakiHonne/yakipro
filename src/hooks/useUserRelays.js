import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUserRelays } from "@/Store/Slices/UserData";
import { getSubData } from "@/Helpers/Helpers";
import { addExplicitRelays } from "@/Helpers/NDKInstance";
import {
  getUserRelaysCache,
  setUserRelaysCache,
} from "@/Cache/userRelaysCache";

export default function useUserRelays() {
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);
  const userRelays = useSelector((state) => state.userRelays);
  const [loading, setLoading] = useState(false);
  // An empty userRelays array is ambiguous on its own: it means both "not fetched
  // yet" and "this account genuinely publishes no relays". Callers that write a
  // new relay list need to tell those apart, so track resolution explicitly.
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setResolved(false);
  }, [userKeys?.pub]);

  // Whatever the source — cache, fetch, or an edit elsewhere — the pool has to
  // learn about these relays, or reads keep going only to the platform defaults.
  // addExplicitRelays skips ones already present, so running this on every change
  // is cheap.
  useEffect(() => {
    if (userRelays.length > 0) {
      addExplicitRelays(userRelays.map((r) => r.url).filter(Boolean)).catch(
        (err) => console.error("[useUserRelays] relay connect failed", err),
      );
    }
  }, [userRelays]);

  useEffect(() => {
    if (userKeys) {
      const cached = getUserRelaysCache();
      if (cached) {
        dispatch(setUserRelays(cached));
        setResolved(true);
      } else if (userRelays.length === 0) {
        fetchRelays();
      } else {
        setResolved(true);
      }
    }
  }, [userKeys, userRelays.length]);

  const fetchRelays = async () => {
    if (!userKeys) return;
    setLoading(true);
    try {
      const data = await getSubData({
        filter: [{ kinds: [10002], authors: [userKeys.pub] }],
      });
      if (data.data.length > 0) {
        const event = data.data[0];
        const relays = event.tags
          .filter((t) => t[0] === "r")
          .map((t) => ({
            url: t[1],
            read: t[2] === "read" || !t[2],
            write: t[2] === "write" || !t[2],
          }));
        dispatch(setUserRelays(relays));
        setUserRelaysCache(relays);
      }
      setResolved(true);
    } catch (err) {
      console.error("[useUserRelays] error:", err);
      // A failed read must not be mistaken for "this account has no relays" —
      // seeding defaults off that would overwrite a list we simply could not see.
    } finally {
      setLoading(false);
    }
  };

  return { userRelays, loading, resolved, refresh: fetchRelays };
}
