import React from "react";

export default function Toggle({
  status,
  setStatus,
  small = false,
  disabled = false,
}) {
  return (
    <div
      className={`pointer toggle ${!status ? "toggle-dim-gray" : ""} ${
        status ? "toggle-c1" : "toggle-dim-gray"
      }`}
      onClick={() => (disabled ? null : setStatus(!status))}
      style={{
        scale: small ? "0.8" : "1",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    ></div>
  );
}
