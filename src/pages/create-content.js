import dynamic from "next/dynamic";

const CreateContent = dynamic(
  () => import("@/PagesComponents/CreateContent/CreateContent"),
  { ssr: false },
);

export default function CreateContentPage() {
  return <CreateContent />;
}
