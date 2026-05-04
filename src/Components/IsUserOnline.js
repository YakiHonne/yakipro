import useAuth from "@/hooks/useAuth";
import React from "react";

export default function IsUserOnline({ children }) {
  const { isConnected } = useAuth();
  if (!isConnected)
    return (
      <div className="fit-container">
        <div className="fx-centered">
          <h1>You're not connected</h1>
        </div>
      </div>
    );

  return <>{children}</>;
}
