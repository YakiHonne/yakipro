import dynamic from "next/dynamic";
import React from "react";

const ClientComponent = dynamic(() => import("@/PagesComponents/Home/Home"), {
  ssr: false,
});

export default function index() {
  return (
    <div>
      <ClientComponent />
    </div>
  );
}
