import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NDKEvent } from "@nostr-dev-kit/ndk";
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

        const relays = userRelays.length > 0 ? userRelays : undefined;
        const publishedTo = await event.publish(relays);

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
