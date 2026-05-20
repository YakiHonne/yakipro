import dynamic from "next/dynamic";

const LoginPage = dynamic(
  () => import("@/PagesComponents/Login/LoginPage"),
  { ssr: false }
);

export default function Login() {
  return <LoginPage />;
}
