import dynamic from "next/dynamic";

const MediaPage = dynamic(
  () => import("@/PagesComponents/Media/MediaPage"),
  { ssr: false },
);

export default function MediaRoute() {
  return <MediaPage />;
}
