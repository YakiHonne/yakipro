import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUserRelays } from "@/Store/Slices/UserData";
import { getSubData } from "@/Helpers/Helpers";
import {
  getUserRelaysCache,
  setUserRelaysCache,
} from "@/Cache/userRelaysCache";

export default function useUserRelays() {
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);
  const userRelays = useSelector((state) => state.userRelays);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userKeys) {
      const cached = getUserRelaysCache();
      if (cached) {
        dispatch(setUserRelays(cached));
      } else if (userRelays.length === 0) {
        fetchRelays();
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
    } catch (err) {
      console.error("[useUserRelays] error:", err);
    } finally {
      setLoading(false);
    }
  };

  return { userRelays, loading, refresh: fetchRelays };
}
