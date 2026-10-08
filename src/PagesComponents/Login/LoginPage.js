import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { getPublicKey, generateSecretKey, nip19 } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils.js";
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
  applySignerToNDK,
  createAccount,
} from "@/Helpers/AccountInit";
import { SelectTabs } from "@/Components/SelectTabs";
import { FileUpload } from "@/Helpers/FileUpload";
import RippleGrid from "@/Components/RippleGrid/RippleGrid";
import QRCode from "react-qr-code";
import { copyText } from "@/Helpers/Helpers";
import PomegranateLoginOverlay from "@/PagesComponents/Login/GoogleLoginOverlay";

// ── Shared backend login helper ───────────────────────────────────────────────
async function doBackendLogin(dispatch, keys) {
  const { activateAccount, bootAccount } = await import("@/Helpers/AccountInit");

  // Every LoginPage sign-in path funnels through here, and none of them reload the page —
  // so this is where the in-memory caches left by the previous account have to be dropped.
  activateAccount(keys.pub);

  // Relay-side state (profile, relay list) loads in the background: waiting on
  // it here put several relay timeouts in front of the backend login.
  return bootAccount(keys, { interactive: true });
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
        const ok = await doBackendLogin(dispatch, keys);
        if (ok) onSuccess?.();
        else dispatch(setToast({ type: 2, desc: t("ALog014") }));
        return;
      }
      if (/^[0-9a-f]{64}$/i.test(input)) {
        const keys = { pub: input };
        dispatch(setUserKeys(keys));
        localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
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
        { name: "YakiPro", url: "https://pro.yakihonne.com", perms: [] },
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

  // The overlay owns the Pomegranate flow; persisting the resulting account
  // (local store, backend session) stays here with the rest of LoginPage.
  const persistAccount = async (keys) => {
    localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
    const ok = await doBackendLogin(dispatch, keys);
    if (ok) onSuccess?.();
  };

  return (
    <PomegranateLoginOverlay
      onClose={onClose}
      onSaveAccount={persistAccount}
    />
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
