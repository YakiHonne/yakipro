import { useEffect, useState } from "react";

export default function useLightningPayment(pubkey) {
  const [status, setStatus] = useState("waiting");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!pubkey) return;

    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const base = process.env.NEXT_PUBLIC_API_URL;
    const url = `${base}/api/lightning/payment-stream/${pubkey}?api_key=${encodeURIComponent(apiKey)}`;

    const es = new EventSource(url, { withCredentials: true });

    es.onopen = () => {
      console.log("[LN] SSE open");
    };

    es.onmessage = (ev) => {
      console.log("[LN] message:", ev.data);
      try {
        const parsed = JSON.parse(ev.data);
        if (parsed.status === "paid") {
          setData(parsed);
          setStatus("paid");
          es.close();
        }
      } catch {
      }
    };

    es.onerror = () => {
      console.log("[LN] SSE error/closed");
      es.close();
      setStatus((prev) => (prev === "paid" ? prev : "error"));
    };

    return () => {
      es.close();
    };
  }, [pubkey]);

  return { status, data };
}
