import dynamic from "next/dynamic";

const ProfileEdit = dynamic(
  () => import("@/PagesComponents/Profile/ProfileEdit"),
  { ssr: false },
);

export default function ProfilePage() {
  return <ProfileEdit />;
}
