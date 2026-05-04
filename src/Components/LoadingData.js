import React from "react";
import LoadingScreen from "./LoadingScreen";

export default function LoadingData({ children, isLoading, height }) {
  if (isLoading)
    return (
      <div className="fx-centered box-pad-h fit-container">
        <LoadingScreen height={height} />
      </div>
    );
  return <>{children}</>;
}
