import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { nip44 } from "nostr-tools";
import { getSubData } from "@/Helpers/Helpers";
import { getMasterKey, DVM_PUBLIC_KEY } from "@/Helpers/EventSchedulerHelper";

export default function useScheduledEvents() {
  const userKeys = useSelector((state) => state.userKeys);
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetch = useCallback(async () => {
    if (!userKeys?.pub) return;
    setLoading(true);
    setError(false);
    try {
      const keys = await getMasterKey();
      if (!keys) {
        setScheduledEvents([]);
        return;
      }

      const globalIndexDTag = `pidgeon:v3:mb:${keys.mb}:index`;
      const globalIndexEvents = await getSubData({
        filter: [{ kinds: [30078], authors: [DVM_PUBLIC_KEY], "#d": [globalIndexDTag] }],
        raw: true,
      });
      if (globalIndexEvents.data.length === 0) {
        setScheduledEvents([]);
        return;
      }

      const metadata = JSON.parse(
        nip44.v2.decrypt(globalIndexEvents.data[0].content, keys.mbox),
      );
      const pendingDTags = (metadata.pending_pages || []).map((p) => p.d);
      if (pendingDTags.length === 0) {
        setScheduledEvents([]);
        return;
      }

      const pendingEvents = await getSubData({
        filter: [{ kinds: [30078], authors: [DVM_PUBLIC_KEY], "#d": pendingDTags }],
        raw: true,
      });
      if (pendingEvents.data.length === 0) {
        setScheduledEvents([]);
        return;
      }

      const pendingList = pendingEvents.data
        .map((e) => JSON.parse(nip44.v2.decrypt(e.content, keys.mbox)))
        .map((e) => e.pending)
        .flat();

      const seen = new Set();
      const normalized = pendingList
        .map((job) => ({
          notePreview: {
            created_at: job.scheduledAt,
            kind: job.jobType === "note" ? 1 : 6,
            ...job.notePreview,
            pubkey: userKeys.pub,
            id: job.jobId,
            relays: job.relays,
          },
          noteId: job.noteId,
          jobId: job.jobId,
        }))
        .filter((job) => {
          if (seen.has(job.noteId)) return false;
          seen.add(job.noteId);
          return true;
        });

      setScheduledEvents(normalized);
    } catch (err) {
      console.error("[useScheduledEvents]", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userKeys?.pub]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { scheduledEvents, loading, error, fetch };
}
