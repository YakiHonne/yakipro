import { generateAuthorizationHeaderForBlossomServer } from "@/Helpers/Helpers";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

const YAKI_BLOSSOM = process.env.NEXT_PUBLIC_BLOSSOM_SERVER;

export default function useBlossomManagement() {
  const userKeys = useSelector((state) => state.userKeys);
  const userBlossomServers = useSelector((state) => state.userBlossomServers);

  const [blobs, setBlobs] = useState({});
  const [allBlobs, setAllBlobs] = useState([]);
  const [isBlobsLoading, setIsBlobsLoading] = useState(true);
  const [authHeader, setAuthHeader] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [yakiUsage, setYakiUsage] = useState(null);
  const [isYakiUsageLoading, setIsYakiUsageLoading] = useState(true);

  const blossomColors = useMemo(
    () => userBlossomServers.map((_, i) => `hsl(${i * 47}, 65%, 55%)`),
    [userBlossomServers],
  );

  // The auth header is signed by the previous account's key and the blobs are that
  // account's uploads — both must go when the account changes, or the media page lists
  // the old account's files (and authenticates as them).
  useEffect(() => {
    setAuthHeader(null);
    setBlobs({});
    setAllBlobs([]);
    setYakiUsage(null);
  }, [userKeys?.pub]);

  // Our server's consumption is shown whether or not the user has added it to
  // their list, so it cannot be derived from the per-server blobs above — those
  // only cover listed servers. Queried on its own from first connection.
  useEffect(() => {
    if (!userKeys || !YAKI_BLOSSOM) {
      setIsYakiUsageLoading(false);
      return;
    }

    let cancelled = false;
    const fetchYakiUsage = async () => {
      setIsYakiUsageLoading(true);
      try {
        const token = await generateAuthorizationHeaderForBlossomServer({
          servers: [YAKI_BLOSSOM],
          tTag: "list",
        });
        const { data } = await axios.get(
          `${YAKI_BLOSSOM}/list/${userKeys.pub}`,
          { headers: { Authorization: `Nostr ${token}` } },
        );
        if (cancelled) return;
        const used = Array.isArray(data)
          ? data.reduce((sum, blob) => sum + (blob.size || 0), 0)
          : 0;
        setYakiUsage(used);
      } catch (err) {
        if (!cancelled) {
          console.error("[useBlossomManagement] yaki usage failed", err);
          setYakiUsage(null);
        }
      } finally {
        if (!cancelled) setIsYakiUsageLoading(false);
      }
    };

    fetchYakiUsage();
    return () => {
      cancelled = true;
    };
  }, [userKeys?.pub, timestamp]);

  useEffect(() => {
    if (!userKeys || userBlossomServers.length === 0) {
      setIsBlobsLoading(false);
      setBlobs({});
      setAllBlobs([]);
      return;
    }

    const fetchData = async () => {
      setIsBlobsLoading(true);
      try {
        let token = authHeader;
        if (!token) {
          token = await generateAuthorizationHeaderForBlossomServer({
            servers: userBlossomServers,
            tTag: "list",
          });
          setAuthHeader(token);
        }

        const responses = await Promise.allSettled(
          userBlossomServers.map((server) =>
            axios.get(`${server}/list/${userKeys.pub}`, {
              headers: { Authorization: `Nostr ${token}` },
            }),
          ),
        );

        const perServer = responses.map((res, i) => ({
          url: userBlossomServers[i],
          blobs:
            res.status === "fulfilled" && Array.isArray(res.value.data)
              ? res.value.data.sort((a, b) => b.uploaded - a.uploaded)
              : [],
        }));

        const allBlobsMap = new Map();
        perServer.forEach((serverData, serverIndex) => {
          serverData.blobs.forEach((blob) => {
            if (allBlobsMap.has(blob.sha256)) {
              allBlobsMap.get(blob.sha256).seen = [
                ...new Set([...allBlobsMap.get(blob.sha256).seen, serverIndex]),
              ];
            } else {
              allBlobsMap.set(blob.sha256, { ...blob, seen: [serverIndex] });
            }
          });
        });

        const blobsByServer = {};
        perServer.forEach(({ url, blobs }) => {
          blobsByServer[url] = blobs;
        });

        setBlobs(blobsByServer);
        setAllBlobs(Array.from(allBlobsMap.values()));
      } catch (err) {
        console.error("[useBlossomManagement]", err);
      } finally {
        setIsBlobsLoading(false);
      }
    };

    fetchData();
  }, [userKeys, userBlossomServers, timestamp]);

  const refreshLists = () => {
    setAuthHeader(null);
    setTimestamp(Date.now());
  };

  return {
    userBlossomServers,
    blobs,
    allBlobs,
    isBlobsLoading,
    blossomColors,
    refreshLists,
    yakiUsage,
    isYakiUsageLoading,
  };
}
