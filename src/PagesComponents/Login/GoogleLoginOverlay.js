import { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { getPublicKey, generateSecretKey, nip19 } from "nostr-tools";
import { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import Icon from "@/Components/LucideIcon";
import Overlay from "@/Components/Overlay";
import Spinner from "@/Components/Spinner";
import { setUserKeys } from "@/Store/Slices/UserData";
import { setToast } from "@/Store/Slices/Extras";
import { hexToUint8Array } from "@/Helpers/Encryptions";
import { copyText } from "@/Helpers/Helpers";
import { ndkInstance } from "@/Helpers/NDKInstance";
import {
  massageURL,
  isValidServerURL,
  hostOf,
  authenticateWithGoogle,
  getAccount,
  resolveDefaultBunker,
  findExistingSetup,
  publishConfigEvent,
  createPomegranateAccount,
} from "@/Helpers/Pomegranate";
import {
  CENTRALS,
  OPERATOR_URLS,
  DEFAULT_OPERATOR_URLS,
} from "@/Content/pomegrenate";

const shortenKey = (key) =>
  key ? `${key.substring(0, 10)}...${key.substring(key.length - 10)}` : "";

const downloadKey = (nsecValue) => {
  const content = [
    "Important: Store this information securely.",
    "---",
    `Private key: ${nsecValue}`,
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nostr-private-key.txt";
  a.click();
  URL.revokeObjectURL(url);
};

// The discovered account's profile, fetched straight from the relays. The app's
// own metadata helper writes into the store, which would clobber the session.
const fetchProfile = async (pubkey) => {
  try {
    const user = ndkInstance.getUser({ pubkey });
    await user.fetchProfile();
    const profile = user?.profile || {};
    const npub = nip19.npubEncode(pubkey);
    return {
      picture: profile.image || profile.picture || "",
      display_name: profile.displayName || profile.display_name || npub,
      name: profile.name || npub,
    };
  } catch {
    const npub = nip19.npubEncode(pubkey);
    return { picture: "", display_name: npub, name: npub };
  }
};

const IdentityAvatar = ({ src, size = 64 }) => (
  <div
    className="bg-img cover-bg fx-centered"
    style={{
      backgroundImage: src ? `url(${src})` : "none",
      backgroundColor: "var(--color-primary-bg-side2)",
      minWidth: `${size}px`,
      width: `${size}px`,
      aspectRatio: "1/1",
      borderRadius: "50%",
      flexShrink: 0,
    }}
  >
    {!src && <Icon name="user_01" size={Math.round(size / 2)} opacity={0.35} />}
  </div>
);

export default function GoogleLoginOverlay({ onClose, onSaveAccount }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [phase, setPhase] = useState("central");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState(null);
  const [copied, setCopied] = useState(false);
  // must stay stable, it is the NIP-46 client key saved with the account
  const localKeys = useMemo(() => NDKPrivateKeySigner.generate(), []);

  const centrals = useMemo(
    () => CENTRALS.map((c) => ({ ...c, url: massageURL(c.url) })),
    [],
  );
  const [selectedCentral, setSelectedCentral] = useState(centrals[0].url);
  const [useCustomCentral, setUseCustomCentral] = useState(false);
  const [customCentral, setCustomCentral] = useState("");

  const [keyMode, setKeyMode] = useState("generate");
  const [secretKey, setSecretKey] = useState(() => generateSecretKey());
  const [importedKey, setImportedKey] = useState("");
  const [importError, setImportError] = useState("");

  const [operators, setOperators] = useState(() =>
    DEFAULT_OPERATOR_URLS.map(massageURL),
  );
  const [newOperator, setNewOperator] = useState("");
  const [threshold, setThreshold] = useState(() =>
    Math.min(2, DEFAULT_OPERATOR_URLS.length),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [foundSetup, setFoundSetup] = useState(null);
  const [foundUser, setFoundUser] = useState(null);

  // Show who the existing account belongs to, so the user can tell whether it
  // is really theirs before connecting.
  useEffect(() => {
    if (!foundSetup?.pubkey) {
      setFoundUser(null);
      return;
    }
    let cancelled = false;
    fetchProfile(foundSetup.pubkey).then((user) => {
      if (!cancelled) setFoundUser(user);
    });
    return () => {
      cancelled = true;
    };
  }, [foundSetup?.pubkey]);

  const central = useCustomCentral
    ? isValidServerURL(customCentral)
      ? massageURL(customCentral)
      : ""
    : selectedCentral;

  const suggestedOperators = OPERATOR_URLS.map(massageURL).filter(
    (op) => !operators.includes(op),
  );

  const nsec = nip19.nsecEncode(secretKey);
  const busy = !["idle", "error"].includes(status);

  const statusLabel =
    {
      authenticating: t("Apom004"),
      checking: t("Apom005"),
      creating: t("Apom006"),
    }[status] || "";

  const saveAccount = async ({ pubkey, bunkerUrl, central, email }) => {
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
    await onSaveAccount?.(keys);
  };

  const connectExisting = async (centralUrl, googleToken) => {
    const account = await getAccount(centralUrl, googleToken);
    if (!account) return false;
    const bunkerUrl = await resolveDefaultBunker(centralUrl, googleToken);
    await saveAccount({
      pubkey: account.pubkey,
      bunkerUrl,
      central: centralUrl,
      email: googleToken.email,
    });
    return true;
  };

  const handleStart = async (targetCentral = central) => {
    if (!targetCentral) return;
    setErrorMsg("");
    setStatus("authenticating");
    try {
      const googleToken = await authenticateWithGoogle(targetCentral);
      setToken(googleToken);
      setStatus("checking");

      if (await connectExisting(targetCentral, googleToken)) {
        setStatus("idle");
        onClose();
        return;
      }

      // Look for a setup published from another central before creating a
      // brand new one. Passing the target central makes discovery skip the
      // events that point back at it.
      const existing = await findExistingSetup(googleToken.email, targetCentral);
      if (existing && existing.central && existing.central !== targetCentral) {
        setFoundSetup(existing);
        setStatus("idle");
        setPhase("found");
        return;
      }

      setStatus("idle");
      setPhase("setup");
    } catch (err) {
      if (err.message === "POPUP_CLOSED") {
        setStatus("idle");
        return;
      }
      if (err.message === "POPUP_BLOCKED") {
        setStatus("error");
        setErrorMsg(t("AHqyO3m"));
        return;
      }
      setStatus("error");
      setErrorMsg(err.message || t("AEH0z9N"));
    }
  };

  const handleConnectFound = async () => {
    if (!foundSetup?.central) return;
    setErrorMsg("");
    setStatus("authenticating");
    try {
      const googleToken = await authenticateWithGoogle(foundSetup.central);
      setToken(googleToken);
      setStatus("checking");
      if (await connectExisting(foundSetup.central, googleToken)) {
        setStatus("idle");
        onClose();
        return;
      }
      setStatus("idle");
      setFoundSetup(null);
      setPhase("setup");
    } catch (err) {
      if (err.message === "POPUP_CLOSED") {
        setStatus("idle");
        return;
      }
      setStatus("error");
      setErrorMsg(err.message || t("AEH0z9N"));
    }
  };

  const handleCreateInstead = () => {
    setFoundSetup(null);
    setErrorMsg("");
    setStatus("idle");
    setPhase("setup");
  };

  const applyImportedKey = () => {
    setImportError("");
    const value = importedKey.trim();
    if (!value) return null;
    try {
      if (value.startsWith("nsec")) {
        const { type, data } = nip19.decode(value);
        if (type !== "nsec") throw new Error();
        return data;
      }
      if (!/^[0-9a-fA-F]{64}$/.test(value)) throw new Error();
      return hexToUint8Array(value);
    } catch {
      setImportError(t("AIdFeYb"));
      return null;
    }
  };

  const addOperator = () => {
    const value = newOperator.trim();
    if (!value || !isValidServerURL(value)) return;
    const url = massageURL(value);
    if (operators.includes(url)) {
      setNewOperator("");
      return;
    }
    setOperators([...operators, url]);
    setNewOperator("");
  };

  const removeOperator = (url) => {
    const next = operators.filter((op) => op !== url);
    setOperators(next);
    if (threshold > next.length) setThreshold(Math.max(1, next.length));
  };

  const handleCreate = async () => {
    if (!token || !central) return;
    setErrorMsg("");

    let keyToUse = secretKey;
    if (keyMode === "import") {
      const imported = applyImportedKey();
      if (!imported) return;
      keyToUse = imported;
      setSecretKey(imported);
    }

    if (
      operators.length === 0 ||
      threshold < 1 ||
      threshold > operators.length
    ) {
      setErrorMsg(t("AxnAEcr"));
      return;
    }

    setStatus("creating");
    try {
      // A generated key is only shown to the user at this point, so make sure
      // they get a backup of it before it leaves the browser.
      if (keyMode === "generate") {
        downloadKey(nip19.nsecEncode(keyToUse));
        dispatch(setToast({ type: 1, desc: t("Apom010") }));
      }

      await createPomegranateAccount(
        central,
        token,
        operators,
        threshold,
        keyToUse,
      );

      let account = null;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        account = await getAccount(central, token);
        if (account) break;
      }
      if (!account) throw new Error(t("Ar66dzx"));

      await publishConfigEvent({
        email: token.email,
        central,
        operators,
        threshold,
        secretKey: keyToUse,
      });

      const bunkerUrl = await resolveDefaultBunker(central, token);

      await saveAccount({
        pubkey: account.pubkey,
        bunkerUrl,
        central,
        email: token.email,
      });

      setStatus("idle");
      onClose();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || t("AEH0z9N"));
    }
  };

  const handleCopy = () => {
    copyText(nsec, t("AStACDI"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const backTo = (target) => {
    setPhase(target);
    setErrorMsg("");
    setStatus("idle");
  };

  const roundBtnStyle = {
    padding: "0 1rem",
    borderRadius: "50%",
    aspectRatio: "1/1",
    width: "44px",
    height: "44px",
  };

  return (
    <Overlay exit={onClose} width={480}>
      <div className="login-google-overlay box-pad-h box-pad-v bg-dropdown-t">
        <div className="close" onClick={onClose}>
          <div></div>
        </div>

        {phase === "central" && (
          <>
            <div className="login-google-head">
              <Icon name="google" size={32} />
              <h4>{t("Apom001")}</h4>
              <p className="gray-c">{t("Apom011")}</p>
            </div>

            <div className="fit-container">
              <p className="p-bold">{t("A8SE9H1")}</p>
              <p className="gray-c">{t("AdoAL8m")}</p>
            </div>

            <div className="login-convo-options" style={{ marginTop: 0 }}>
              {centrals.map((item, index) => {
                const isSelected =
                  !useCustomCentral && selectedCentral === item.url;
                return (
                  <div
                    key={item.url}
                    className={`login-convo-option box-pad-h-m box-pad-v-s bg-dropdown-t ${isSelected ? "selected-option" : ""}`}
                    style={{ "--stagger-i": index }}
                    onClick={() => {
                      setUseCustomCentral(false);
                      setSelectedCentral(item.url);
                    }}
                  >
                    <span className="login-convo-option-icon">
                      <Icon
                        name={isSelected ? "circle_check" : "circle"}
                        size={20}
                        v={2}
                        isBoldThemeColor={isSelected}
                      />
                    </span>
                    <span className="login-convo-option-copy">
                      <b>{hostOf(item.url)}</b>
                    </span>
                    <span className="sticker sticker-gray sticker-small">
                      {item.kind === "default" ? t("ANmIqNJ") : t("ATqpiwj")}
                    </span>
                  </div>
                );
              })}

              <div
                className={`login-convo-option box-pad-h-m box-pad-v-s bg-dropdown-t ${useCustomCentral ? "selected-option" : ""}`}
                style={{ "--stagger-i": centrals.length }}
                onClick={() => setUseCustomCentral(true)}
              >
                <span className="login-convo-option-icon">
                  <Icon
                    name={useCustomCentral ? "circle_check" : "circle"}
                    size={20}
                    v={2}
                    isBoldThemeColor={useCustomCentral}
                  />
                </span>
                <span className="login-convo-option-copy">
                  <b>{t("AabmNg4")}</b>
                </span>
              </div>
            </div>

            {useCustomCentral && (
              <input
                type="text"
                className="if ifs-full"
                placeholder={t("AG91nf9")}
                value={customCentral}
                onChange={(e) => setCustomCentral(e.target.value)}
                autoFocus
              />
            )}

            {errorMsg && (
              <p className="red-c" style={{ textAlign: "center" }}>
                {errorMsg}
              </p>
            )}

            {busy ? (
              <div className="login-google-busy fx-centered fx-col">
                <Spinner size={24} />
                <p className="gray-c">{statusLabel}</p>
              </div>
            ) : (
              <button
                className="btn btn-normal btn-full"
                onClick={() => handleStart()}
                disabled={!central}
              >
                {errorMsg ? t("AhOnn0t") : t("Apom003")}
              </button>
            )}
          </>
        )}

        {phase === "found" && (
          <>
            <div className="login-google-head">
              <Icon name="server" size={32} isBoldThemeColor />
              <h4>{t("AR7xWde")}</h4>
              <p className="gray-c">
                {t("A5uh9MU", { central: hostOf(foundSetup?.central || "") })}
              </p>
            </div>

            {errorMsg && (
              <p className="red-c" style={{ textAlign: "center" }}>
                {errorMsg}
              </p>
            )}

            {busy ? (
              <div className="login-google-busy fx-centered fx-col">
                <Spinner size={24} />
                <p className="gray-c">{statusLabel}</p>
              </div>
            ) : (
              <>
                <div className="pom-identity-cards">
                  <div className="pom-identity-card">
                    <IdentityAvatar src={foundUser?.picture} size={64} />
                    <div className="pom-identity-copy">
                      <p className="p-bold p-one-line">
                        {foundUser
                          ? foundUser.display_name.startsWith("npub")
                            ? shortenKey(foundUser.display_name)
                            : foundUser.display_name
                          : ""}
                      </p>
                      {foundUser &&
                        !foundUser.name.startsWith("npub") &&
                        foundUser.name !== foundUser.display_name && (
                          <p className="gray-c p-medium p-one-line">
                            @{foundUser.name}
                          </p>
                        )}
                    </div>
                    <button
                      className="btn btn-normal btn-full"
                      onClick={handleConnectFound}
                    >
                      {t("ANqJi0v", {
                        central: hostOf(foundSetup?.central || ""),
                      })}
                    </button>
                  </div>

                  <div className="pom-identity-card">
                    <div className="pom-identity-unknown fx-centered">
                      <span>?</span>
                    </div>
                    <div className="pom-identity-copy">
                      <p className="p-bold p-one-line">{t("AAvmg0n")}</p>
                      <p className="gray-c p-medium p-one-line">
                        {t("AMUoqQa")}
                      </p>
                    </div>
                    <button
                      className="btn btn-gst btn-full"
                      onClick={handleCreateInstead}
                    >
                      {t("ACwufz6")}
                    </button>
                  </div>
                </div>

                <div className="fx-centered fit-container">
                  <button
                    className="btn btn-normal btn-gray fx-centered bg-dropdown"
                    style={roundBtnStyle}
                    onClick={() => {
                      setFoundSetup(null);
                      backTo("central");
                    }}
                  >
                    <Icon name="arrow" transform="rotate(90deg)" size={16} />
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {phase === "setup" && (
          <>
            <div className="login-google-head">
              <h4>{t("AcNNqSN")}</h4>
              <p className="gray-c">{t("AMQOKdV")}</p>
            </div>

            <div className="login-convo-options" style={{ marginTop: 0 }}>
              <div
                className={`login-convo-option box-pad-h-m box-pad-v-s bg-dropdown-t ${keyMode === "generate" ? "selected-option" : ""}`}
                style={{ "--stagger-i": 0 }}
                onClick={() => setKeyMode("generate")}
              >
                <span className="login-convo-option-icon">
                  <Icon name="star" size={24} />
                </span>
                <span className="login-convo-option-copy">
                  <b>{t("AfQb7HD")}</b>
                  <span>{t("AjhCCrK")}</span>
                </span>
                <span className="login-convo-option-go">
                  <Icon
                    name={keyMode === "generate" ? "circle_check" : "circle"}
                    size={20}
                    v={2}
                    isBoldThemeColor={keyMode === "generate"}
                  />
                </span>
              </div>

              <div
                className={`login-convo-option box-pad-h-m box-pad-v-s bg-dropdown-t ${keyMode === "import" ? "selected-option" : ""}`}
                style={{ "--stagger-i": 1 }}
                onClick={() => setKeyMode("import")}
              >
                <span className="login-convo-option-icon">
                  <Icon name="key-icon" size={24} />
                </span>
                <span className="login-convo-option-copy">
                  <b>{t("AbXKi4r")}</b>
                  <span>{t("AmQjQOI")}</span>
                </span>
                <span className="login-convo-option-go">
                  <Icon
                    name={keyMode === "import" ? "circle_check" : "circle"}
                    size={20}
                    v={2}
                    isBoldThemeColor={keyMode === "import"}
                  />
                </span>
              </div>
            </div>

            {keyMode === "generate" && (
              <div className="login-google-key-field">
                <p className="p-bold">{t("Apom008")}</p>
                <div className="login-google-key-row">
                  <input
                    type="text"
                    className="if ifs-full"
                    value={nsec}
                    readOnly
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    className="btn btn-normal btn-gray fx-centered bg-dropdown"
                    style={roundBtnStyle}
                    onClick={handleCopy}
                    disabled={busy}
                  >
                    <Icon
                      name={copied ? "check_big" : "copy"}
                      size={16}
                      v={copied ? 2 : 1}
                    />
                  </button>
                </div>
              </div>
            )}

            {keyMode === "import" && (
              <div className="login-google-key-field">
                <p className="p-bold">{t("ArPMdgT")}</p>
                <input
                  type="password"
                  className="if ifs-full"
                  placeholder={t("A7uff0L")}
                  value={importedKey}
                  onChange={(e) => {
                    setImportedKey(e.target.value);
                    setImportError("");
                  }}
                />
                {importError && <p className="red-c">{importError}</p>}
              </div>
            )}

            <div className="fit-container">
              <div
                className={`fx-scattered pointer fit-container ${showAdvanced ? "pom-advanced-toggle" : ""}`}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <div className="fx-centered">
                  <Icon name="settings" size={18} v={2} />
                  <p className="p-bold">{t("AsoXjsL")}</p>
                </div>
                <Icon
                  name="arrow"
                  size={14}
                  transform={showAdvanced ? "rotate(180deg)" : "rotate(0deg)"}
                />
              </div>

              {showAdvanced && (
                <div className="sc-s-18 box-pad-h-m box-pad-v-m fit-container fx-col fx-centered fx-start-v bg-dropdown">
                  <div className="fit-container">
                    <p className="p-bold gray-c">{t("A51mB0F")}</p>
                    <p className="gray-c pom-section-label">{t("Apndhzt")}</p>
                  </div>

                  <div className="fit-container fx-col fx-centered">
                    {operators.map((op) => (
                      <div key={op} className="pom-operator-row">
                        <p>{hostOf(op)}</p>
                        <div
                          className="pom-operator-remove"
                          onClick={() => removeOperator(op)}
                          title={t("AzkTxuy")}
                        >
                          <Icon name="trash" size={17} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="fx-centered fit-container">
                    <input
                      type="text"
                      className="if ifs-full"
                      placeholder={t("AHuJAY1")}
                      value={newOperator}
                      onChange={(e) => setNewOperator(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOperator();
                        }
                      }}
                    />
                    <button
                      className="btn btn-normal btn-small"
                      onClick={addOperator}
                      disabled={!newOperator.trim()}
                    >
                      {t("AflwmPU")}
                    </button>
                  </div>

                  {suggestedOperators.length > 0 && (
                    <div className="fit-container">
                      <p className="gray-c pom-section-label">{t("AjJP77C")}</p>
                      <div className="pom-chips">
                        {suggestedOperators.map((op) => (
                          <div
                            key={op}
                            className="pom-chip"
                            onClick={() => setOperators([...operators, op])}
                          >
                            <Icon name="add_plus" size={14} v={2} />
                            <p>{hostOf(op)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="fit-container">
                    <p className="p-bold gray-c pom-section-label">
                      {t("ABnF1Ro")}
                    </p>
                    <div className="pom-stepper">
                      <button
                        className="pom-stepper-btn"
                        onClick={() => setThreshold(Math.max(1, threshold - 1))}
                        disabled={threshold <= 1}
                      >
                        <Icon name="remove_minus" size={15} v={2} />
                      </button>
                      <p className="pom-stepper-value">{threshold}</p>
                      <button
                        className="pom-stepper-btn"
                        onClick={() =>
                          setThreshold(
                            Math.min(operators.length, threshold + 1),
                          )
                        }
                        disabled={threshold >= operators.length}
                      >
                        <Icon name="add_plus" size={15} v={2} />
                      </button>
                      <p className="gray-c">
                        {t("Av55soW", { count: operators.length })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="red-c" style={{ textAlign: "center" }}>
                {errorMsg}
              </p>
            )}

            {busy ? (
              <div className="login-google-busy fx-centered fx-col">
                <Spinner size={24} />
                <p className="gray-c">{statusLabel}</p>
              </div>
            ) : (
              <div className="login-google-setup-actions">
                <button
                  className="btn btn-normal btn-gray fx-centered bg-dropdown"
                  style={roundBtnStyle}
                  onClick={() => {
                    setToken(null);
                    backTo("central");
                  }}
                  disabled={busy}
                >
                  <Icon name="arrow" transform="rotate(90deg)" size={16} />
                </button>
                <button
                  className="btn btn-normal"
                  onClick={handleCreate}
                  disabled={
                    busy || (keyMode === "import" && !importedKey.trim())
                  }
                >
                  {errorMsg ? t("AhOnn0t") : t("AP9F5rl")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Overlay>
  );
}
