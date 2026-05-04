import dynamic from "next/dynamic";
import React from "react";

const ClientComponent = dynamic(
  () => import("@/PagesComponents/SubPlans/SubPlans"),
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
