import { useEffect } from "react";
import { useRouter } from "next/router";
import { nip19 } from "nostr-tools";
import serverHttpClient from "@/Helpers/ServerHTTP";
import UserProfileView from "@/PagesComponents/Profile/UserProfileView";

const NOSTR_PREFIXES = ["naddr", "nevent", "note", "npub", "nprofile"];

const stripScheme = (value) =>
  value.startsWith("nostr:") ? value.slice("nostr:".length) : value;

const nostrPrefixOf = (value) => {
  const prefix = NOSTR_PREFIXES.find((p) => value.startsWith(p));
  if (!prefix) return null;
  try {
    nip19.decode(value);
    return prefix;
  } catch {
    return null;
  }
};

export default function KeywordPage({ pubkey, username, redirectTo }) {
  const router = useRouter();

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (redirectTo) return null;
  if (!pubkey) return null;

  return <UserProfileView pubkey={pubkey} username={username} />;
}

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

export async function getStaticProps({ params }) {
  const raw = stripScheme(String(params?.keyword || "").trim());
  if (!raw) return { notFound: true, revalidate: 86400 };

  // A nostr schema keeps today's behaviour: redirect to the route that renders it.
  const prefix = nostrPrefixOf(raw);
  if (prefix) {
    const redirectTo =
      prefix === "naddr" || prefix === "nevent" || prefix === "note"
        ? `/article/${raw}`
        : `/content?entity=${raw}`;
    return { props: { redirectTo }, revalidate: 86400 };
  }

  try {
    const { data } = await serverHttpClient.get(
      `/api/v1/user/username/${encodeURIComponent(raw.toLowerCase())}`,
    );
    if (!data?.pubkey) return { notFound: true, revalidate: 86400 };
    // Resolved in place — deliberately not a redirect, so yakihonne.com/<name>
    // stays the canonical URL for the profile.
    return {
      props: { pubkey: data.pubkey, username: data.username || raw },
      revalidate: 86400,
    };
  } catch {
    // Negative results are revalidated on the same cadence so a handle claimed
    // later starts resolving without a deploy.
    return { notFound: true, revalidate: 86400 };
  }
}
