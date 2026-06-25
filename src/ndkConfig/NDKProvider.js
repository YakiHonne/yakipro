"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getNDK } from "@/ndkConfig/ndk";

const NDKContext = createContext(null);

export default function NDKProvider({ children }) {
  const [ndk, setNdk] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const instance = getNDK();

    instance
      .connect()
      .then(() => {
        setIsConnected(true);
        setNdk(instance);
        if (process.env.NODE_ENV === "development") {
          console.log("[NDK] Connected to relays");
        }
      })
      .catch((err) => {
        console.error("[NDK] Connection error:", err);
        setNdk(instance);
      });

    return () => {
    };
  }, []);

  return (
    <NDKContext.Provider value={{ ndk, isConnected }}>
      {children}
    </NDKContext.Provider>
  );
}

export function useNDKContext() {
  const ctx = useContext(NDKContext);
  if (!ctx) {
    throw new Error("useNDKContext must be used inside <NDKProvider>");
  }
  return ctx;
}
