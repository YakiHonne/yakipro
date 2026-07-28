import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { getPublicKey, generateSecretKey, nip19, finalizeEvent } from "nostr-tools";
import Link from "next/link";
import Icon from "@/Components/LucideIcon";
import Orb from "@/Components/Orb/Orb";
import Overlay from "@/Components/Overlay";
import Spinner from "@/Components/Spinner";

import { setUserKeys } from "@/Store/Slices/UserData";
import { setToast } from "@/Store/Slices/Extras";
import {
  getHex,
  hexToUint8Array,
  isValidHexKey,
} from "@/Helpers/Encryptions";
import { ndkInstance } from "@/Helpers/NDKInstance";
import {
  NDKNip46Signer,
  NDKPrivateKeySigner,
} from "@nostr-dev-kit/ndk";
import {
  saveAccountLocally,
  fetchUserMetadata,
  applySignerToNDK,
  createAccount,
} from "@/Helpers/AccountInit";
import { SelectTabs } from "@/Components/SelectTabs";
import { FileUpload } from "@/Helpers/FileUpload";
import RippleGrid from "@/Components/RippleGrid/RippleGrid";
import QRCode from "react-qr-code";
import { copyText } from "@/Helpers/Helpers";
import { trustedKeyDeal, hexShard, hexPubShard } from "@fiatjaf/promenade-trusted-dealer";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { CENTRAL_URL, OPERATOR_URLS } from "@/Content/pomegrenate";

// ── Google sign-in helpers ──────────────────────────────────────────────────
const massageURL = (input) => {
  let url = input.trim();
  if (!url.startsWith("http")) {
    url = "https://" + url;
  }
  return new URL(url).origin;
};

const openPopup = (url, name) => {
  const width = 600;
  const height = 700;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  return window.open(
    url,
    name,
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
  );
};

const awaitPopupMessage = (popup, expectedOrigin, extract) => {
  return new Promise((resolve, reject) => {
    const POPUP_TIMEOUT_MS = 5 * 60 * 1000;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearInterval(closeMonitor);
      clearTimeout(timer);
    };

    const onMessage = (event) => {
      if (event.origin !== expectedOrigin || event.source !== popup) return;
      const value = extract(event.data);
      if (value === undefined) return;
      cleanup();
      popup.close();
      resolve(value);
    };

    const closeMonitor = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("POPUP_CLOSED"));
      }
    }, 300);

    const timer = setTimeout(() => {
      cleanup();
      popup.close();
      reject(new Error("Timed out waiting for Google sign-in"));
    }, POPUP_TIMEOUT_MS);

    window.addEventListener("message", onMessage);
  });
};

const authenticateWithGoogle = async (central) => {
  const popup = openPopup(`${central}/login/google`, "PomegranateLogin");
  if (!popup) throw new Error("POPUP_BLOCKED");

  const raw = await awaitPopupMessage(popup, central, (data) => {
    if (data && typeof data === "object" && typeof data.token === "string") {
      return data.token;
    }
    return undefined;
  });

  let createdAt = null;
  let email = "";
  const parsed = JSON.parse(atob(raw));
  if (typeof parsed.created_at === "number") createdAt = parsed.created_at * 1000;
  if (Array.isArray(parsed.tags)) {
    const emailTag = parsed.tags.find((t) => Array.isArray(t) && t[0] === "email");
    email = emailTag?.[1] ?? "";
  }
  if (!createdAt || Date.now() - createdAt > 24 * 60 * 60 * 1000) {
    throw new Error("Google sign-in token expired");
  }
  return { raw, email, createdAt };
};

const getAccount = async (central, token) => {
  const res = await fetch(`${central}/account`, {
    headers: { Authorization: `Token ${token.raw}` },
  });
  if (res.status === 401) throw new Error("Google session expired, please sign in again");
  if (!res.ok) return null;
  const data = await res.json();
  return data?.pubkey ? data : null;
};

const listProfiles = async (central, token) => {
  const res = await fetch(`${central}/profiles`, {
    headers: { Authorization: `Token ${token.raw}` },
  });
  if (!res.ok) throw new Error("Failed to load signing profiles");
  return await res.json();
};

const createProfile = async (central, token, name) => {
  const res = await fetch(`${central}/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token.raw}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Signing profile creation failed");
  return await res.json();
};

const getBunkerUrl = (central, profile) => {
  const relay = central.replace(/^http/, "ws");
  return `bunker://${profile.handler_pubkey}?relay=${encodeURIComponent(relay)}`;
};

const createPomegranateAccount = async (central, token, operators, threshold, secretKey) => {
  const session = crypto.randomUUID();
  const masterSk = BigInt("0x" + bytesToHex(secretKey));
  const { shards } = trustedKeyDeal(masterSk, threshold, operators.length);

  const regEvent = finalizeEvent(
    {
      kind: 20445,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["threshold", String(threshold)],
        ...operators.map((op, i) => ["operator", op, hexPubShard(shards[i].pubShard)]),
      ],
      content: "",
    },
    secretKey,
  );

  const regRes = await fetch(`${central}/register`, {
    method: "POST",
    body: JSON.stringify(regEvent),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token.raw}`,
      "X-Pomegranate-Session": session,
    },
  });
  if (!regRes.ok) throw new Error("Central server registration failed");

  const utf8 = new TextEncoder();
  const results = await Promise.all(
    operators.map(async (operator, i) => {
      const event = finalizeEvent(
        {
          kind: 20444,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["central", central],
            ["email", token.email],
          ],
          content: hexShard(shards[i]),
        },
        secretKey,
      );
      const opToken = bytesToHex(sha256(utf8.encode(`${session}:${operator}`)));
      try {
        const res = await fetch(`${operator}/po/register`, {
          method: "POST",
          body: JSON.stringify(event),
          headers: {
            "Content-Type": "application/json",
            "X-Pomegranate-Operator-Token": opToken,
          },
        });
        return res.ok ? null : operator;
      } catch {
        return operator;
      }
    }),
  );

  const failed = results.filter(Boolean);
  if (operators.length - failed.length < threshold) {
    throw new Error(
      `INSUFFICIENT_OPERATORS:${operators.length - failed.length}:${threshold}`,
    );
  }
};

// ── Shared backend login helper ───────────────────────────────────────────────
async function doBackendLogin(dispatch, keys) {
  const { login: apiLogin, checkUserConnected } =
    await import("@/Endpoionts/Auth");
  const { setIsConnected, setNostrUser } = await import("@/Store/Slices/User");
  const check = await checkUserConnected();
  if (check && check !== false) {
    dispatch(setNostrUser(check));
    dispatch(setIsConnected(true));
    return true;
  }
  const res = await apiLogin({ publicKey: keys.pub, userKeys: keys });
  if (res && res !== false) {
    dispatch(setNostrUser(res));
    dispatch(setIsConnected(true));
    return true;
  }
  return false;
}

const downloadAsFile = (text, type, name) => {
  const blob = new Blob([text], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ── Method: Key ────────────────────────────────────────────────────────────────
function KeyMethod({ onBack, onSuccess }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    const input = key.trim();
    if (!input) return;
    setLoading(true);
    try {
      if (input.startsWith("npub")) {
        const hex = getHex(input);
        const keys = { pub: hex };
        dispatch(setUserKeys(keys));
        const ok = await doBackendLogin(dispatch, keys);
        if (ok) onSuccess?.();
        else dispatch(setToast({ type: 2, desc: t("ALog014") }));
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
          const ok = await doBackendLogin(dispatch, keys);
          if (ok) onSuccess?.();
          else dispatch(setToast({ type: 2, desc: t("ALog014") }));
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
        const ok = await doBackendLogin(dispatch, keys);
        if (ok) onSuccess?.();
        else dispatch(setToast({ type: 2, desc: t("ALog014") }));
        return;
      }
      if (/^[0-9a-f]{64}$/i.test(input)) {
        const keys = { pub: input };
        dispatch(setUserKeys(keys));
        localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
        const meta = await fetchUserMetadata(keys.pub);
        saveAccountLocally(keys.pub, keys, meta);
        const ok = await doBackendLogin(dispatch, keys);
        if (ok) onSuccess?.();
        else dispatch(setToast({ type: 2, desc: t("ALog014") }));
        return;
      }
      dispatch(setToast({ type: 2, desc: t("ALog014") }));
    } catch (e) {
      dispatch(setToast({ type: 2, desc: t("ALog014") }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-convo-answer">
      <div className="login-convo-back" onClick={onBack}>
        <Icon name="arrow" size={13} transform="rotate(90deg)" />
        {t("ALog009")}
      </div>
      <div className="login-convo-field">
        <input
          type="text"
          className="if"
          placeholder={t("ALog010")}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handle()}
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <div className="login-actions">
          <button
            className="btn btn-normal btn-full"
            onClick={handle}
            disabled={!key.trim() || loading}
          >
            {loading ? <span className="login-spinner" /> : t("ALog011")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Method: Bunker ─────────────────────────────────────────────────────────────
const BUNKER_RELAY =
  "wss://nostr-01.yakihonne.com&relay=wss://offchain.pub&relay=wss://relay.nsec.app&relay=wss://relay.damus.io";

function BunkerMethod({ onBack, onSuccess }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [nostrConnectUri, setNostrConnectUri] = useState("");
  const [qrLoading, setQrLoading] = useState(false);

  const finishConnect = async (signer, bunkerUrl) => {
    const localSigner = signer.localSigner;
    const keys = {
      pub: signer.userPubkey,
      bunker: bunkerUrl,
      localKeys: {
        sec: localSigner.privateKey,
        pub: localSigner.pubkey,
      },
    };
    dispatch(setUserKeys(keys));
    localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
    const meta = await fetchUserMetadata(keys.pub);
    saveAccountLocally(keys.pub, keys, meta);
    const ok = await doBackendLogin(dispatch, keys);
    if (ok) onSuccess?.();
    else dispatch(setToast({ type: 2, desc: t("ALog016") }));
  };

  const launchQrConnect = async () => {
    setQrLoading(true);
    try {
      const localSigner = NDKPrivateKeySigner.generate();
      const signer = NDKNip46Signer.nostrconnect(
        ndkInstance,
        "wss://nostr-01.yakihonne.com",
        localSigner,
        { name: "YakiPro", url: "https://yakipro.com", perms: [] },
      );
      setNostrConnectUri(signer.nostrConnectUri);
      await signer.blockUntilReady();
      ndkInstance.signer = signer;
      const bunkerUrl = `bunker://${signer.bunkerPubkey}?relay=${BUNKER_RELAY}`;
      await finishConnect(signer, bunkerUrl);
    } catch {
      dispatch(setToast({ type: 2, desc: t("ALog016") }));
    } finally {
      setQrLoading(false);
      setNostrConnectUri("");
    }
  };

  const handle = async () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("bunker://")) {
      dispatch(setToast({ type: 2, desc: t("ALog017") }));
      return;
    }
    setLoading(true);
    try {
      const localSigner = NDKPrivateKeySigner.generate();
      const signer = new NDKNip46Signer(ndkInstance, trimmed, localSigner);
      ndkInstance.signer = signer;
      await signer.blockUntilReady();
      await finishConnect(signer, trimmed);
    } catch {
      dispatch(setToast({ type: 2, desc: t("ALog016") }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-convo-answer">
      <div className="login-convo-back" onClick={onBack}>
        <Icon name="arrow" size={13} transform="rotate(90deg)" />
        {t("ALog009")}
      </div>

      {nostrConnectUri ? (
        <div className="login-bunker-qr">
          <div className="close" onClick={() => { setNostrConnectUri(""); setQrLoading(false); }}>
            <div></div>
          </div>
          <p className="login-card-subtitle">{t("ALog021")}</p>
          <div className="login-qr-frame">
            <QRCode value={nostrConnectUri} width={220} />
          </div>
          <div
            className="login-bunker-uri pointer"
            onClick={(e) => copyText(nostrConnectUri, t("ALog025"), e)}
          >
            <p className="p-one-line gray-c">{nostrConnectUri}</p>
            <Icon name="copy" />
          </div>
        </div>
      ) : (
        <div className="login-convo-field">
          <button
            className="btn btn-gst btn-full"
            onClick={launchQrConnect}
            disabled={qrLoading}
          >
            {qrLoading ? <span className="login-spinner" /> : t("ALog007")}
          </button>

          <div className="login-divider-row">
            <hr />
            <span>{t("ALog023")}</span>
            <hr />
          </div>

          <input
            type="text"
            className="if"
            placeholder={t("ALog012")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            spellCheck={false}
          />
          <div className="login-actions">
            <button
              className="btn btn-normal btn-full"
              onClick={handle}
              disabled={!url.trim() || loading}
            >
              {loading ? <span className="login-spinner" /> : t("ALog011")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Method: Google ───────────────────────────────────────────────────────────
function GoogleLoginOverlay({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [phase, setPhase] = useState("intro");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState(null);
  const [secretKey, setSecretKey] = useState(() => generateSecretKey());
  const [copied, setCopied] = useState(false);
  const [localKeys] = useState(() => NDKPrivateKeySigner.generate());
  const central = massageURL(CENTRAL_URL);
  const operators = OPERATOR_URLS.map(massageURL);
  const threshold = Math.ceil((operators.length * 7) / 12);

  const nsec = nip19.nsecEncode(secretKey);
  const busy = !["idle", "error"].includes(status);

  const statusLabel =
    {
      authenticating: t("AGoog04"),
      checking: t("AGoog05"),
      creating: t("AGoog06"),
    }[status] || "";

  const handleSaveAccount = async ({ pubkey, bunkerUrl, central, email }) => {
    const keys = {
      pub: pubkey,
      bunker: bunkerUrl,
      localKeys: {
        sec: localKeys.privateKey,
        pub: getPublicKey(hexToUint8Array(localKeys.privateKey)),
      },
      central,
      email,
    };
    dispatch(setUserKeys(keys));
    localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
    const meta = await fetchUserMetadata(keys.pub);
    saveAccountLocally(keys.pub, keys, meta);
    const ok = await doBackendLogin(dispatch, keys);
    if (ok) onSuccess?.();
    onClose();
  };

  const handleStart = async () => {
    setErrorMsg("");
    setStatus("authenticating");
    try {
      const googleToken = await authenticateWithGoogle(central);
      setToken(googleToken);
      setStatus("checking");
      const account = await getAccount(central, googleToken);
      if (account) {
        let profiles = await listProfiles(central, googleToken);
        if (!profiles.find((p) => p.name === "default")) {
          await createProfile(central, googleToken, "default");
          profiles = await listProfiles(central, googleToken);
        }
        const profile = profiles.find((p) => p.name === "default") || profiles[0];
        const bunkerUrl = getBunkerUrl(central, profile);
        await handleSaveAccount({
          pubkey: account.pubkey,
          bunkerUrl,
          central,
          email: googleToken.email,
        });
        setStatus("idle");
      } else {
        const newKey = generateSecretKey();
        setSecretKey(newKey);
        downloadAsFile(
          nip19.nsecEncode(newKey),
          "text/plain",
          "nostr-private-key.txt",
        );
        dispatch(setToast({ type: 1, desc: t("AGoog10") }));
        setStatus("idle");
        setPhase("setup");
      }
    } catch (err) {
      if (err.message === "POPUP_CLOSED") {
        setStatus("idle");
        return;
      }
      if (err.message === "POPUP_BLOCKED") {
        setStatus("error");
        setErrorMsg(t("AGoog12"));
        return;
      }
      setStatus("error");
      setErrorMsg(err.message || t("AGoog13"));
    }
  };

  const handleCreate = async () => {
    if (!token) return;
    setErrorMsg("");
    setStatus("creating");
    try {
      await createPomegranateAccount(central, token, operators, threshold, secretKey);

      let account = null;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        account = await getAccount(central, token);
        if (account) break;
      }
      if (!account) throw new Error(t("AGoog15"));

      let profiles = await listProfiles(central, token);
      if (!profiles.find((p) => p.name === "default")) {
        await createProfile(central, token, "default");
        profiles = await listProfiles(central, token);
      }
      const profile = profiles.find((p) => p.name === "default") || profiles[0];
      const bunkerUrl = getBunkerUrl(central, profile);

      await handleSaveAccount({
        pubkey: account.pubkey,
        bunkerUrl,
        central,
        email: token.email,
      });

      setStatus("idle");
    } catch (err) {
      setStatus("error");
      if (err.message?.startsWith("INSUFFICIENT_OPERATORS:")) {
        const [, succeeded, neededThreshold] = err.message.split(":");
        setErrorMsg(t("AGoog14", { succeeded, threshold: neededThreshold }));
        return;
      }
      setErrorMsg(err.message || t("AGoog13"));
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(nsec);
    dispatch(setToast({ type: 1, desc: t("AGoog16") }));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Overlay exit={onClose} width={420}>
      <div className="login-google-overlay box-pad-h box-pad-v pos-relative">
        <div className="close pos-absolute pos-top-16 pos-right-16" onClick={onClose}>
          <div></div>
        </div>
        {phase === "intro" && (
          <>
            <div className="login-google-head">
              <Icon name="google" size={32} />
              <h4 className="login-card-title-plain" style={{ fontSize: "1.2rem" }}>
                {t("AGoog01")}
              </h4>
              <p className="gray-c p-medium">{t("AGoog02")}</p>
            </div>

            {errorMsg && (
              <p className="p-red-c p-medium" style={{ textAlign: "center" }}>
                {errorMsg}
              </p>
            )}

            {busy ? (
              <div className="login-google-busy fx-centered fx-col">
                <Spinner size={24} />
                <p className="gray-c p-medium">{statusLabel}</p>
              </div>
            ) : (
              <button className="btn btn-normal btn-full" onClick={handleStart}>
                {errorMsg ? t("AGoog11") : t("AGoog03")}
              </button>
            )}
          </>
        )}

        {phase === "setup" && (
          <>
            <div className="login-google-head">
              <h4 className="login-card-title-plain" style={{ fontSize: "1.2rem" }}>
                {t("AGoog07")}
              </h4>
            </div>

            <div className="login-google-key-field">
              <p className="p-medium p-bold">{t("AGoog08")}</p>
              <div className="login-google-key-row">
                <input
                  type="text"
                  className="if"
                  value={nsec}
                  readOnly
                  onClick={(e) => e.target.select()}
                  style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                />
                <button
                  className="btn btn-gray fx-centered login-google-copy-btn"
                  onClick={handleCopy}
                  disabled={busy}
                >
                  <Icon name={copied ? "checkmark" : "copy"} size={16} />
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="p-red-c p-medium" style={{ textAlign: "center" }}>
                {errorMsg}
              </p>
            )}

            {busy ? (
              <div className="login-google-busy fx-centered fx-col">
                <Spinner size={24} />
                <p className="gray-c p-medium">{statusLabel}</p>
              </div>
            ) : (
              <div className="login-google-setup-actions">
                <button
                  className="btn btn-gray fx-centered login-google-copy-btn"
                  onClick={() => {
                    setPhase("intro");
                    setToken(null);
                    setStatus("idle");
                    setErrorMsg("");
                  }}
                  disabled={busy}
                >
                  <Icon name="arrow" transform="rotate(90deg)" size={16} />
                </button>
                <button className="btn btn-normal" onClick={handleCreate} disabled={busy}>
                  {errorMsg ? t("AGoog11") : t("AGoog09")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Overlay>
  );
}

// ── Signup ───────────────────────────────────────────────────────────────────
const PROFILE_PLACEHOLDER =
  "https://yakihonne.s3.ap-east-1.amazonaws.com/media/images/profile-avatar.png";

function SignupScreen({ onSuccess }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [pictureFile, setPictureFile] = useState(null);
  const [picture, setPicture] = useState("");
  const [creating, setCreating] = useState(false);
  const fileInputId = "signup-avatar-input";

  // Generated once and held for the lifetime of the screen — regenerating on each render
  // would hand the user a different key than the one their downloaded backup file names.
  const [keys] = useState(() => {
    const sk = generateSecretKey();
    return { sec: bytesToHex(sk), pub: getPublicKey(sk) };
  });

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureFile(file);
    setPicture(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (creating) return;
    if (!name.trim()) {
      dispatch(setToast({ type: 2, desc: t("AcKscQl") }));
      return;
    }
    setCreating(true);
    try {
      // Upload before any key/session mutation: if the image fails we can still bail out
      // cleanly without having half-created an account. The generated keys are passed
      // explicitly because nothing has been written to localStorage yet at this point,
      // so the signer can only come from here.
      let pictureUrl = "";
      if (pictureFile) {
        const uploaded = await FileUpload({ file: pictureFile, userKeys: keys });
        if (!uploaded || !uploaded.url) {
          dispatch(setToast({ type: 2, desc: t("Almq94P") }));
          setCreating(false);
          return;
        }
        pictureUrl = uploaded.url;
      }

      downloadAsFile(
        [
          t("A7Mh9O6"),
          "---",
          `Private key: ${nip19.nsecEncode(hexToUint8Array(keys.sec))}`,
          `Public key: ${nip19.npubEncode(keys.pub)}`,
        ].join("\n"),
        "text/plain",
        "account-credentials.txt",
      );

      const ok = await createAccount({
        keys,
        name: name.trim(),
        picture: pictureUrl,
      });

      if (!ok) {
        dispatch(setToast({ type: 2, desc: t("Ai4af1h") }));
        setCreating(false);
        return;
      }

      dispatch(setToast({ type: 1, desc: t("AaWkOl3") }));
      onSuccess?.();
    } catch (err) {
      console.error("[Signup] account creation failed:", err);
      dispatch(setToast({ type: 2, desc: t("Ai4af1h") }));
      setCreating(false);
    }
  };

  return (
    <div className="fit-container signup-step-body">
      <p className="signup-step-title">{t("At9t6yz")}</p>

      <div className="fit-container fx-col fx-centered box-pad-h">
        <label htmlFor={fileInputId} className="signup-avatar-wrap pointer">
          <div
            className="signup-avatar-img"
            style={{ backgroundImage: `url(${picture || PROFILE_PLACEHOLDER})` }}
          />
          <div className="signup-avatar-overlay fx-centered fx-col pointer toggle">
            <Icon name="image" size={24} />
            <p className="gray-c p-medium">{t("A4N51J3")}</p>
          </div>
        </label>
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          onChange={handlePick}
          disabled={creating}
          style={{ position: "absolute", opacity: 0, zIndex: -1, pointerEvents: "none" }}
        />
      </div>

      <div className="fit-container fx-centered fx-col signup-name-field">
        <input
          type="text"
          className="if ifs-full p-bold p-centered if-no-border"
          placeholder={t("AU2yMBa")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          disabled={creating}
          autoFocus
        />
      </div>

      <div className="login-step-nav">
        <button
          className="btn btn-normal btn-full"
          onClick={handleCreate}
          disabled={creating || !name.trim()}
        >
          {creating ? <span className="login-spinner" /> : t("AyYkCrS")}
        </button>
      </div>

      {creating && (
        <p className="gray-c p-medium" style={{ textAlign: "center", marginTop: 12 }}>
          {t("AkvXmyz")}
        </p>
      )}
    </div>
  );
}

// ── Main LoginPage ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [activeMethod, setActiveMethod] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [checkExt, setCheckExt] = useState(false);
  const [extLoading, setExtLoading] = useState(false);
  const [showGoogleLogin, setShowGoogleLogin] = useState(false);
  const router = useRouter();
  const isConnected = useSelector((state) => state.isConnected);
  const loadingConnectedUser = useSelector((state) => state.loadingConnectedUser);

  useEffect(() => {
    setCheckExt(typeof window !== "undefined" && !!window.nostr);
  }, []);

  useEffect(() => {
    if (!loadingConnectedUser && isConnected) {
      router.replace("/dashboard");
    }
  }, [isConnected, loadingConnectedUser, router]);

  const handleSuccess = () => router.replace("/dashboard");

  const handleExtension = async () => {
    if (!checkExt) return;
    setExtLoading(true);
    try {
      const pub = await window.nostr.getPublicKey();
      const keys = { pub, ext: true };
      await applySignerToNDK(keys);
      dispatch(setUserKeys(keys));
      localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
      const meta = await fetchUserMetadata(keys.pub);
      saveAccountLocally(keys.pub, keys, meta);
      const ok = await doBackendLogin(dispatch, keys);
      if (ok) handleSuccess();
      else dispatch(setToast({ type: 2, desc: t("ALog015") }));
    } catch {
      dispatch(setToast({ type: 2, desc: t("ALog015") }));
    } finally {
      setExtLoading(false);
    }
  };

  const methods = [
    {
      id: "key",
      icon: "key-icon",
      title: t("ALog003"),
      desc: t("ALog004"),
    },
    {
      id: "extension",
      icon: "puzzle",
      iconV: 2,
      title: t("ALog005"),
      desc: t("ALog006"),
      disabled: !checkExt,
    },
    {
      id: "bunker",
      icon: "bolt",
      title: t("ALog007"),
      desc: t("ALog008"),
    },
    {
      id: "google",
      icon: "google",
      title: t("ALog019"),
      desc: t("ALog020"),
    },
  ];

  const handleMethodClick = (method) => {
    if (method.disabled) return;
    if (method.id === "extension") {
      handleExtension();
      return;
    }
    if (method.id === "google") {
      setShowGoogleLogin(true);
      return;
    }
    setActiveMethod(method.id);
  };

  return (
    <div className="login-stage">
      <div className="login-bg-layer">
        {/* <Orb /> */}
        <RippleGrid />
      </div>
      <div className="login-vignette" />

      <div className="login-brandmark">
        <Link href="/">
          <Icon name="yakihonne-logo" width={120} height={42} isColored={false} />
        </Link>
        <Link href="/pricing" className="login-brandmark-link">
          {t("ALog013")}
        </Link>
      </div>

      <div className="login-stage-content">
        <div className="login-card bg-dropdown-t">
          <button
            className="btn btn-normal btn-gray fx-centered bg-dropdown login-back-btn"
            onClick={() => router.back()}
          >
            <Icon name="arrow" transform="rotate(90deg)" />
          </button>
          <div className="login-card-head">
            <p className="login-card-eyebrow">{t("ALog018")}</p>
            <h3
              className="login-card-title-plain"
              key={isLogin ? "login" : "signup"}
            >
              {isLogin ? t("ALog001") : t("AUb1YTL")}
            </h3>
          </div>

          <div className="login-mode-tabs fx-centered">
            <div>
              <SelectTabs
                selectedTab={isLogin ? 0 : 1}
                tabs={[t("AFk1EBA"), t("AmdnVra")]}
                setSelectedTab={(index) => {
                  setIsLogin(index === 0);
                  setActiveMethod("");
                }}
              />
            </div>
          </div>

          {!isLogin && <SignupScreen onSuccess={handleSuccess} />}

          {isLogin && (
          <div className="login-conversation">
            <p className="login-convo-question gray-c">{t("ALog002")}</p>

            {!activeMethod && (
              <div className="login-convo-options">
                {methods.map((method, index) => (
                  <div
                    key={method.id}
                    className={`login-convo-option box-pad-h-m box-pad-v-s bg-dropdown-t ${method.disabled ? "disabled" : ""}`}
                    style={{ "--stagger-i": index }}
                    onClick={() => handleMethodClick(method)}
                  >
                    <span className="login-convo-option-icon">
                      <Icon
                        name={method.icon}
                        v={method.iconV || 1}
                        size={28}
                        isColored={method.iconColored}
                      />
                    </span>
                    <span className="login-convo-option-copy">
                      <b>{method.title}</b>
                      <span>{method.desc}</span>
                    </span>
                    <span className="login-convo-option-go">
                      {method.id === "extension" && extLoading ? (
                        <span className="login-spinner" />
                      ) : (
                        <Icon name="arrow" size={14} transform="rotate(-90deg)" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeMethod === "key" && (
              <KeyMethod onBack={() => setActiveMethod("")} onSuccess={handleSuccess} />
            )}
            {activeMethod === "bunker" && (
              <BunkerMethod onBack={() => setActiveMethod("")} onSuccess={handleSuccess} />
            )}
          </div>
          )}
        </div>
      </div>

      {showGoogleLogin && (
        <GoogleLoginOverlay
          onClose={() => setShowGoogleLogin(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
