import { useRouter } from "next/router";
import ArticleView from "@/PagesComponents/Article/ArticleView";

export default function ArticlePage() {
  const { query } = useRouter();
  const { naddr } = query;

  if (!naddr) return null;

  return <ArticleView naddr={naddr} />;
}
