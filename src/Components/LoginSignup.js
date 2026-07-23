import { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { getPublicKey } from "nostr-tools";
import * as secp from "@noble/secp256k1";
import { setUserKeys } from "@/Store/Slices/UserData";
import { setToast } from "@/Store/Slices/Extras";
import {
  getBech32,
  getHex,
  hexToUint8Array,
  isValidHexKey,
} from "@/Helpers/Encryptions";
import { ndkInstance } from "@/Helpers/NDKInstance";
import {
  NDKNip07Signer,
  NDKNip46Signer,
  NDKPrivateKeySigner,
} from "@nostr-dev-kit/ndk";

import {
  saveAccountLocally,
  fetchUserMetadata,
  applySignerToNDK,
} from "@/Helpers/AccountInit";
import { SelectTabs } from "./SelectTabs";
import Overlay from "./Overlay";
import Button from "./UI/Button";

export default function LoginSignup({ exit }) {
  const [tab, setTab] = useState("key");
  const tabs = ["key", "extension", "bunker"];
  const tabLabels = ["Key", "Extension", "Remote signer"];
  const activeTabIndex = tabs.indexOf(tab);

  return (
    <Overlay exit={exit}>
      <div
        className="box-pad-h box-pad-v fx-col fx-scattered"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          rowGap: "24px",
        }}
      >
        <h3>Connect to YakiPro</h3>

        <SelectTabs
          tabs={tabLabels}
          selectedTab={activeTabIndex}
          setSelectedTab={(index) => setTab(tabs[index])}
        />

        {tab === "key" && <KeyLoginScreen exit={exit} />}
        {tab === "extension" && <ExtensionLoginScreen exit={exit} />}
        {tab === "bunker" && <BunkerLoginScreen exit={exit} />}
      </div>
    </Overlay>
  );
}

const KeyLoginScreen = ({ exit }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const input = key.trim();
    if (!input) return;
    setLoading(true);

    try {
      if (input.startsWith("npub")) {
        const hex = getHex(input);
        const keys = { pub: hex };
        dispatch(setUserKeys(keys));
        persistKeys(keys);
        exit?.();
        return;
      }

      if (input.startsWith("nsec")) {
        const hex = getHex(input);
        if (hex) {
          const pub = getPublicKey(hexToUint8Array(hex));
          const keys = { sec: hex, pub };
          await applySignerToNDK(keys);
          dispatch(setUserKeys(keys));
          localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
          const meta = await fetchUserMetadata(keys.pub);
          saveAccountLocally(keys.pub, keys, meta);

          const { login: apiLogin, checkUserConnected } =
            await import("@/Endpoionts/Auth");
          const { setIsConnected } = await import("@/Store/Slices/User");
          const check = await checkUserConnected();
          if (check && check.success && check.pubkey === keys.pub) {
            dispatch(setIsConnected(true));
          } else {
            const loginRes = await apiLogin({
              publicKey: keys.pub,
              userKeys: keys,
            });
            if (loginRes && loginRes.success) {
              dispatch(setIsConnected(true));
            }
          }

          exit?.();
          return;
        }
      }

      if (isValidHexKey(input)) {
        const pub = getPublicKey(hexToUint8Array(input));
        const keys = { sec: input, pub };
        await applySignerToNDK(keys);
        dispatch(setUserKeys(keys));
        localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
        const meta = await fetchUserMetadata(keys.pub);
        saveAccountLocally(keys.pub, keys, meta);

        const { login: apiLogin, checkUserConnected } =
          await import("@/Endpoionts/Auth");
        const { setIsConnected } = await import("@/Store/Slices/User");
        const check = await checkUserConnected();
        if (check && check.success && check.pubkey === keys.pub) {
          dispatch(setIsConnected(true));
        } else {
          const loginRes = await apiLogin({
            publicKey: keys.pub,
            userKeys: keys,
          });
          if (loginRes && loginRes.success) {
            dispatch(setIsConnected(true));
          }
        }

        exit?.();
        return;
      }

      if (/^[0-9a-f]{64}$/i.test(input)) {
        const keys = { pub: input };
        dispatch(setUserKeys(keys));
        localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
        const meta = await fetchUserMetadata(keys.pub);
        saveAccountLocally(keys.pub, keys, meta);

        const { login: apiLogin, checkUserConnected } =
          await import("@/Endpoionts/Auth");
        const { setIsConnected } = await import("@/Store/Slices/User");
        const check = await checkUserConnected();
        if (check && check.success && check.pubkey === keys.pub) {
          dispatch(setIsConnected(true));
        } else {
          const loginRes = await apiLogin({
            publicKey: keys.pub,
            userKeys: keys,
          });
          if (loginRes && loginRes.success) {
            dispatch(setIsConnected(true));
          }
        }

        exit?.();
        return;
      }

      dispatch(
        setToast({ type: 2, desc: t("AC5ByUA") }),
      );
    } catch (e) {
      console.log(e);
      dispatch(setToast({ type: 2, desc: t("AC5ByUA") }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fit-container fx-col" style={{ gap: "12px" }}>
      <input
        type="text"
        className="if ifs-full"
        placeholder="npub, nsec or hex key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
      />
      <Button
        label={t("AqwEL0G")}
        full={true}
        onClick={handleLogin}
        disabled={!key.trim()}
        loading={loading}
      />
    </div>
  );
};

const ExtensionLoginScreen = ({ exit }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const hasExtension = typeof window !== "undefined" && !!window.nostr;

  const handleExtLogin = async () => {
    if (!hasExtension) return;
    setLoading(true);
    try {
      const pub = await window.nostr.getPublicKey();
      const keys = { pub, ext: true };
      await applySignerToNDK(keys);
      dispatch(setUserKeys(keys));
      localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
      const meta = await fetchUserMetadata(keys.pub);
      saveAccountLocally(keys.pub, keys, meta);

      const { login: apiLogin, checkUserConnected } =
        await import("@/Endpoionts/Auth");
      const { setIsConnected } = await import("@/Store/Slices/User");
      const check = await checkUserConnected();
      if (check && check.success && check.pubkey === keys.pub) {
        dispatch(setIsConnected(true));
      } else {
        const loginRes = await apiLogin({
          publicKey: keys.pub,
          userKeys: keys,
        });
        if (loginRes && loginRes.success) {
          dispatch(setIsConnected(true));
        }
      }

      exit?.();
    } catch (err) {
      console.error(err);
      dispatch(
        setToast({ type: 2, desc: t("AiHLMRi") }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fit-container fx-col fx-centered" style={{ gap: "16px" }}>
      {hasExtension ? (
        <>
          <p className="gray-c p-centered">
            {t("AvcFYqP")}
          </p>
          <Button
            label={t("AvcFYqP")}
            full={true}
            onClick={handleExtLogin}
            loading={loading}
          />
        </>
      ) : (
        <>
          <p className="gray-c p-centered">
            {t("AesMg52")}
          </p>
          <Button
            label="Get Alby"
            type="gray"
            full={true}
            onClick={() => window.open("https://getalby.com", "_blank")}
          />
          <Button
            label="Get nos2x"
            type="gray"
            full={true}
            onClick={() =>
              window.open("https://github.com/fiatjaf/nos2x", "_blank")
            }
          />
        </>
      )}
    </div>
  );
};

const BunkerLoginScreen = ({ exit }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [bunkerURL, setBunkerURL] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBunkerLogin = async () => {
    const trimmed = bunkerURL.trim();
    if (!trimmed.startsWith("bunker://")) {
      dispatch(setToast({ type: 2, desc: "URL must start with bunker://" }));
      return;
    }
    setLoading(true);
    try {
      const { generateSecretKey, getPublicKey } = await import("nostr-tools");
      const localSec = Buffer.from(generateSecretKey()).toString("hex");
      const localPub = getPublicKey(localSec);

      const localSigner = new NDKPrivateKeySigner(localSec);
      const signer = new NDKNip46Signer(ndkInstance, trimmed, localSigner);
      ndkInstance.signer = signer;

      await signer.blockUntilReady();

      const remotePub = (await signer.user()).pubkey;
      const keys = {
        pub: remotePub,
        bunker: trimmed,
        localKeys: { sec: localSec, pub: localPub },
      };
      dispatch(setUserKeys(keys));
      localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
      const meta = await fetchUserMetadata(keys.pub);
      saveAccountLocally(keys.pub, keys, meta);

      const { login: apiLogin, checkUserConnected } =
        await import("@/Endpoionts/Auth");
      const { setIsConnected } = await import("@/Store/Slices/User");
      const check = await checkUserConnected();
      if (check && check.success && check.pubkey === keys.pub) {
        dispatch(setIsConnected(true));
      } else {
        const loginRes = await apiLogin({
          publicKey: keys.pub,
          userKeys: keys,
        });
        if (loginRes && loginRes.success) {
          dispatch(setIsConnected(true));
        }
      }

      exit?.();
    } catch (err) {
      console.error("[Bunker] login error:", err);
      dispatch(
        setToast({
          type: 2,
          desc: t("AJY8vLC"),
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fit-container fx-col" style={{ gap: "12px" }}>
      <p className="gray-c p-centered">
        {t("A9eQr6B")} —{" "}
        {t("AJdT1m0")}
      </p>
      <input
        type="text"
        className="if ifs-full"
        placeholder="bunker://..."
        value={bunkerURL}
        onChange={(e) => setBunkerURL(e.target.value)}
      />
      <Button
        label="Connect"
        full={true}
        onClick={handleBunkerLogin}
        disabled={!bunkerURL.trim()}
        loading={loading}
      />
      <p className="gray-c p-medium p-centered">
        Compatible with nsecBunker, Nostr Connect, and similar signers.
      </p>
    </div>
  );
};
