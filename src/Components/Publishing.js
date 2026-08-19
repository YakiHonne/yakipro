import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NDKEvent, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { ndkInstance } from "@/Helpers/NDKInstance";
import { setToPublish, setIsPublishing, setToast } from "@/Store/Slices/Publishers";

export default function Publishing() {
  const dispatch = useDispatch();
  const toPublish = useSelector((state) => state.publishers.toPublish);
  const userRelays = useSelector((state) => state.userRelays);

  useEffect(() => {
    const handlePublish = async () => {
      if (!toPublish) return;

      const { kind, content, tags = [] } = toPublish;
      dispatch(setIsPublishing(true));

      try {
        const event = new NDKEvent(ndkInstance);
        event.kind = kind;
        event.content = content;
        event.tags = tags;

        await event.sign();

        const writeUrls = (userRelays || [])
          .map((relay) => (typeof relay === "string" ? relay : relay?.url))
          .filter((url) => typeof url === "string" && url.length > 0);
        const relaySet =
          writeUrls.length > 0
            ? NDKRelaySet.fromRelayUrls(writeUrls, ndkInstance)
            : undefined;
        const publishedTo = await event.publish(relaySet);

        console.log("[Publishing] Success:", publishedTo);
        dispatch(setToast({ type: 1, desc: "Event published successfully!" }));
      } catch (err) {
        console.error("[Publishing] Error:", err);
        dispatch(setToast({ type: 2, desc: "Failed to publish event." }));
      } finally {
        dispatch(setIsPublishing(false));
        dispatch(setToPublish(false));
      }
    };

    if (toPublish) {
      handlePublish();
    }
  }, [toPublish, userRelays, dispatch]);

  return null;
}
