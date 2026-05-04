import dynamic from "next/dynamic";

const Content = dynamic(() => import("@/PagesComponents/Content/Content"), {
  ssr: false,
});

export default function ContentPage() {
  return <Content />;
}
