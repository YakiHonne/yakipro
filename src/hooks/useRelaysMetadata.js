import {
  getRelayMetadata,
  getEmptyRelaysData,
} from "@/Cache/relayMetadataCache";
import { saveRelayMetadata } from "@/Helpers/Helpers";
import { useEffect, useState } from "react";

export default function useRelaysMetadata(url) {
  const [relayMetadata, setRelayMetadata] = useState(getEmptyRelaysData(url));

  useEffect(() => {
    const fetchData = async () => {
      try {
        let data = getRelayMetadata(url);

        if (!data || data.isEmpty) {
          data = await saveRelayMetadata([url]);
          if (data && data.length > 0) {
            data = data[0];
          } else {
            data = getEmptyRelaysData(url);
          }
        }
        setRelayMetadata(data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  return { relayMetadata };
}
