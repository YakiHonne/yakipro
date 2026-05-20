import dynamic from "next/dynamic";

const EditContent = dynamic(
  () => import("@/PagesComponents/CreateContent/EditContent"),
  { ssr: false },
);

export default function EditContentPage() {
  return <EditContent />;
}
