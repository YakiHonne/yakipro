import React from "react";
import Spinner from "./Spinner";

export default function LoadingScreen({ width = "100%", height = "80vh" }) {
  return (
    <div className="fx-centered" style={{ width, height }}>
      <Spinner />
    </div>
  );
}
