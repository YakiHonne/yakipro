import { generateAuthorizationHeaderForBlossomServer } from "@/Helpers/Helpers";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

export default function useBlossomManagement() {
  const userKeys = useSelector((state) => state.userKeys);
  const userBlossomServers = useSelector((state) => state.userBlossomServers);

  const [blobs, setBlobs] = useState({});
  const [allBlobs, setAllBlobs] = useState([]);
  const [isBlobsLoading, setIsBlobsLoading] = useState(true);
  const [authHeader, setAuthHeader] = useState(null);
  const [timestamp, setTimestamp] = useState(null);

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
  }, [userKeys?.pub]);

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
  };
}
