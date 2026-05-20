import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { getPublicKey } from "nostr-tools";
import * as secp from "@noble/secp256k1";
import Link from "next/link";
import Icon from "@/Components/Icon";

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

// ── Animated mesh background ──────────────────────────────────────────────────
function MeshBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const NODE_COUNT = 36;
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.2 + 0.4,
    }));
    const DIST = 140;
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < DIST) {
            const alpha = (1 - dist / DIST) * 0.14;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(247,88,22,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(247,88,22,0.28)";
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="login-canvas" aria-hidden="true" />;
}

// ── Method: Key ────────────────────────────────────────────────────────────────
function KeyMethod({ onSuccess }) {
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
        else dispatch(setToast({ type: 2, desc: t("AC5ByUA") }));
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
          else dispatch(setToast({ type: 2, desc: t("AC5ByUA") }));
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
        else dispatch(setToast({ type: 2, desc: t("AC5ByUA") }));
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
        else dispatch(setToast({ type: 2, desc: t("AC5ByUA") }));
        return;
      }
      dispatch(setToast({ type: 2, desc: t("AC5ByUA") }));
    } catch (e) {
      dispatch(setToast({ type: 2, desc: t("AC5ByUA") }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-method-body">
      <p className="login-method-desc">
        Paste your <code>nsec</code>, <code>npub</code>, or raw hex key to
        connect. Read-only mode is available with a public key.
      </p>
      <input
        type="text"
        className="login-input"
        placeholder="nsec1… or npub1… or hex"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handle()}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        className="login-cta-btn"
        onClick={handle}
        disabled={!key.trim() || loading}
      >
        {loading ? <span className="login-spinner" /> : "Connect with key →"}
      </button>
    </div>
  );
}

// ── Method: Extension ──────────────────────────────────────────────────────────
function ExtensionMethod({ onSuccess }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const hasExt = typeof window !== "undefined" && !!window.nostr;

  const handle = async () => {
    if (!hasExt) return;
    setLoading(true);
    try {
      const pub = await window.nostr.getPublicKey();
      const keys = { pub, ext: true };
      await applySignerToNDK(keys);
      dispatch(setUserKeys(keys));
      localStorage.setItem("_nostruserkeys", JSON.stringify(keys));
      const meta = await fetchUserMetadata(keys.pub);
      saveAccountLocally(keys.pub, keys, meta);
      const ok = await doBackendLogin(dispatch, keys);
      if (ok) onSuccess?.();
      else dispatch(setToast({ type: 2, desc: t("AiHLMRi") }));
    } catch {
      dispatch(setToast({ type: 2, desc: t("AiHLMRi") }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-method-body">
      {hasExt ? (
        <>
          <p className="login-method-desc">
            A NIP-07 browser extension was detected. Sign in securely — your
            keys never leave the extension.
          </p>
          <div className="login-ext-detected">
            <span className="login-ext-dot" />
            Extension detected
          </div>
          <button className="login-cta-btn" onClick={handle} disabled={loading}>
            {loading ? (
              <span className="login-spinner" />
            ) : (
              "Connect with extension →"
            )}
          </button>
        </>
      ) : (
        <>
          <p className="login-method-desc">
            No NIP-07 extension found. Install one to sign in with your browser
            wallet.
          </p>
          <div className="login-ext-cards">
            <a
              href="https://getalby.com"
              target="_blank"
              rel="noopener noreferrer"
              className="login-ext-card"
            >
              <div>
                <div className="login-ext-card-name">Alby</div>
                <div className="login-ext-card-sub">Bitcoin & Nostr wallet</div>
              </div>
              <span className="login-ext-card-arrow">↗</span>
            </a>
            <a
              href="https://github.com/fiatjaf/nos2x"
              target="_blank"
              rel="noopener noreferrer"
              className="login-ext-card"
            >
              <div>
                <div className="login-ext-card-name">nos2x</div>
                <div className="login-ext-card-sub">Minimal key signer</div>
              </div>
              <span className="login-ext-card-arrow">↗</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// ── Method: Bunker ─────────────────────────────────────────────────────────────
function BunkerMethod({ onSuccess }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    const trimmed = url.trim();
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
      const ok = await doBackendLogin(dispatch, keys);
      if (ok) onSuccess?.();
      else dispatch(setToast({ type: 2, desc: t("AJY8vLC") }));
    } catch {
      dispatch(setToast({ type: 2, desc: t("AJY8vLC") }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-method-body">
      <p className="login-method-desc">
        Connect via a NIP-46 remote signer. Compatible with nsecBunker, Nostr
        Connect, and similar tools.
      </p>
      <input
        type="text"
        className="login-input"
        placeholder="bunker://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        spellCheck={false}
      />
      <button
        className="login-cta-btn"
        onClick={handle}
        disabled={!url.trim() || loading}
      >
        {loading ? <span className="login-spinner" /> : "Connect via bunker →"}
      </button>
    </div>
  );
}

// ── Method selector cards ──────────────────────────────────────────────────────
const METHODS = [
  {
    id: "key",
    label: "Private Key",
    sub: "nsec / npub / hex",
  },
  {
    id: "extension",
    label: "Extension",
    sub: "NIP-07 browser signer",
  },
  {
    id: "bunker",
    label: "Remote Signer",
    sub: "bunker:// URL",
  },
];

// ── Main LoginPage ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [method, setMethod] = useState("key");
  const router = useRouter();
  const isConnected = useSelector((state) => state.isConnected);
  const loadingConnectedUser = useSelector((state) => state.loadingConnectedUser);

  useEffect(() => {
    if (!loadingConnectedUser && isConnected) {
      router.replace("/home");
    }
  }, [isConnected, loadingConnectedUser, router]);

  const handleSuccess = () => router.replace("/home");

  return (
    <div className="login-root">
      <MeshBackground />

      {/* Mesh blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      {/* Nav strip */}
      <nav className="login-nav">
        <Link href="/" className="login-nav-logo">
          <Icon name="yakihonne-logo" width={108} height={54} />
        </Link>
        <Link href="/pricing" className="login-nav-link">
          Pricing
        </Link>
      </nav>

      <div className="login-layout">
        {/* ── Left brand column ── */}
        <div className="login-brand">
          <div className="login-brand-inner">
            <div className="login-brand-pill">✦ Built on Nostr</div>
            <h1 className="login-brand-title">
              Your keys.
              <br />
              <em>Your writing.</em>
              <br />
              Your audience.
            </h1>
            <p className="login-brand-sub">
              YakiPro is a creator platform built on the Nostr protocol. No
              accounts. No servers holding your content. Just your key.
            </p>
            <div className="login-brand-facts">
              {[
                "Self-sovereign identity",
                "Lightning payments",
                "Censorship-resistant",
                "Relay-redundant",
              ].map((text) => (
                <div key={text} className="login-brand-fact">
                  <p>+ {text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form column ── */}
        <div className="login-form-col">
          <div className="login-card">
            <div className="login-card-header">
              <h2 className="login-card-title">Connect to YakiPro</h2>
              <p className="login-card-sub">Choose how you'd like to sign in</p>
            </div>

            {/* Method selector */}
            <div className="login-methods-grid">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  className={`login-method-card ${method === m.id ? "active" : ""}`}
                  onClick={() => setMethod(m.id)}
                >
                  <span className="login-method-card-label">{m.label}</span>
                  <span className="login-method-card-sub">{m.sub}</span>
                  {method === m.id && (
                    <span className="login-method-card-dot" />
                  )}
                </button>
              ))}
            </div>

            {/* Active method form */}
            <div className="login-form-body">
              {method === "key" && <KeyMethod onSuccess={handleSuccess} />}
              {method === "extension" && (
                <ExtensionMethod onSuccess={handleSuccess} />
              )}
              {method === "bunker" && (
                <BunkerMethod onSuccess={handleSuccess} />
              )}
            </div>

            <div className="login-card-footer">
              <p>
                New to Nostr?{" "}
                <a
                  href="https://nostr.how"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="login-footer-link"
                >
                  Learn about self-sovereign identity →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
