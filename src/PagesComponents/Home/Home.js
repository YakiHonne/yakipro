import { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/router";
import LoginSignup from "@/Components/LoginSignup";
import Button from "@/Components/UI/Button";

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const userKeys = useSelector((state) => state.userKeys);

  return (
    <main
      className="fit-container fx-centered fx-col"
      style={{ padding: "40px", gap: "16px" }}
    >
      <h1>YakiPro</h1>
      <div className="fx-centered fx-col">
        <p className="p-secondary-c">{t("AKJqtlx")}</p>
        {!userKeys && (
          <Button
            size="m"
            type="primary"
            onClick={() => setShowLogin(true)}
            label={t("AsXpL4b")}
          />
        )}
        {userKeys && (
          <>
            <p className="p-success">Successfully connected!</p>
            <Button
              size="m"
              type="outlined"
              onClick={() => router.push("/analytics")}
              label="Creator Analytics"
            />
          </>
        )}
      </div>

      {showLogin && <LoginSignup exit={() => setShowLogin(false)} />}
    </main>
  );
}
