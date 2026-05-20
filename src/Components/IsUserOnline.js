import useAuth from "@/hooks/useAuth";
import React from "react";
import Link from "next/link";
import Spinner from "@/Components/Spinner";

export default function IsUserOnline({ children }) {
  const { isConnected, loadingConnectedUser } = useAuth();

  if (loadingConnectedUser)
    return (
      <div className="fit-container fx-centered" style={{ height: "100vh" }}>
        <Spinner size={32} />
      </div>
    );

  if (!isConnected)
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ gap: 16 }}>
          <h4>You're not connected</h4>
          <Link href="/login" className="btn btn-primary">
            Connect
          </Link>
        </div>
      </div>
    );

  return <>{children}</>;
}
