"use client";

import { illustrationsUrls } from "@/Content/AssetsURLs";

export default function Illustration({ name, size = 300, onClick }) {
  const src = illustrationsUrls[name];

  if (!src) return null;

  return (
    <div
      onClick={onClick && onClick}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: "contain",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        cursor: onClick ? "pointer" : "default",
        transition: ".2s ease-in-out",
        minWidth: size,
        minHeight: size,
        width: size,
        height: size,
      }}
    />
  );
}
