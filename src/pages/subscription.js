import dynamic from "next/dynamic";
import React from "react";

const ClientComponent = dynamic(
  () => import("@/PagesComponents/Subscription/Subscription"),
  {
    ssr: false,
  },
);

export default function index() {
  return (
    <div>
      <ClientComponent />
    </div>
  );
}
