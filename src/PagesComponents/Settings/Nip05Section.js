import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { InitEvent } from "@/Helpers/Encryptions";
import { publishEvent } from "@/Helpers/Helpers";
import { setUserMetadata } from "@/Store/Slices/UserData";
import { setNostrUser } from "@/Store/Slices/User";
import { setToast } from "@/Store/Slices/Extras";
import Button from "@/Components/UI/Button";
import Input from "@/Components/UI/Input";
import Spinner from "@/Components/Spinner";
import { claimNip05 } from "@/Endpoionts/Nip05";
import { ndkInstance } from "@/Helpers/NDKInstance";
import { getParsedAuthor } from "@/Helpers/Encryptions";

// ── Helpers ───────────────────────────────────────────────────────────────────

const isYakihonne = (nip05) =>
  typeof nip05 === "string" && nip05.endsWith("@yakihonne.com");

async function validateNip05Remote(nip05Address, pubkey) {
  try {
    const [name, domain] = nip05Address.split("@");
    const res = await fetch(
      `https://${domain}/.well-known/nostr.json?name=${name}`
    );
    const json = await res.json();
    return json.names?.[name] === pubkey;
  } catch {
    return false;
  }
}

async function isNameAvailableRemote(name) {
  try {
    const res = await fetch(
      `https://yakihonne.com/.well-known/nostr.json?name=${encodeURIComponent(name)}`
    );
    const json = await res.json();
    return json.names?.[name] === undefined;
  } catch {
    return null;
  }
}

// ── Shared small components ───────────────────────────────────────────────────

function ValidityBadge({ validating, valid, t }) {
  if (validating)
    return (
      <span className="fx-centered fx-gap-h">
        <Spinner size={14} />
        <span className="p-secondary-c p-medium">{t("ANip05S")}</span>
      </span>
    );
  if (valid === true)
    return <span className="p-green-c p-medium">✓ {t("ANip05I")}</span>;
  if (valid === false)
    return <span className="p-red-c p-medium">✗ {t("ANip05J")}</span>;
  return null;
}

function AvailabilityIndicator({ checking, available, t }) {
  if (checking)
    return (
      <span className="fx-centered fx-gap-h">
        <Spinner size={14} />
        <span className="p-secondary-c p-medium">{t("ANip05T")}</span>
      </span>
    );
  if (available === true)
    return <span className="p-green-c p-medium">✓ {t("ANip05F")}</span>;
  if (available === false)
    return <span className="p-red-c p-medium">✗ {t("ANip05G")}</span>;
  return null;
}

function UsedTag({ t }) {
  return (
    <div
      className="sticker-small sticker-gst-green"
    >
      {t("ANip05Z")}
    </div>
  );
}

function NameForm({
  nameInput,
  onNameChange,
  checking,
  available,
  skipAvailCheck,
  submitting,
  postError,
  onSubmit,
  submitLabel,
  t,
}) {
  const canSubmit =
    nameInput.trim().length > 0 &&
    !submitting &&
    !checking &&
    (skipAvailCheck || available === true);

  return (
    <div className="fx-centered fx-col fit-container fx-gap-v-m">
      <div className="fx-centered fit-container fx-gap-h">
        <Input
          placeholder={t("ANip05E")}
          value={nameInput}
          onChange={onNameChange}
          disabled={submitting}
        />
        <span className="p-secondary-c" style={{ flexShrink: 0 }}>
          @yakihonne.com
        </span>
      </div>

      {nameInput.trim().length > 0 && !skipAvailCheck && (
        <div className="fit-container fx-centered fx-start-h">
          <AvailabilityIndicator checking={checking} available={available} t={t} />
        </div>
      )}

      {postError && (
        <p className="p-red-c p-medium fit-container">{postError}</p>
      )}

      <div className="fit-container fx-centered fx-end-h">
        <Button
          label={submitLabel}
          type="primary"
          size="m"
          disabled={!canSubmit}
          loading={submitting}
          onClick={onSubmit}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Nip05Section() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);
  const userMetadata = useSelector((state) => state.userMetadata);
  const nostrUser = useSelector((state) => state.nostrUser);

  const pubkey = userKeys?.pub;
  const metaNip05 = userMetadata?.nip05 || "";
  const accountNip05Name = nostrUser?.nip05?.name || "";
  const accountNip05Active = Boolean(nostrUser?.nip05?.is_active);

  // Validation of current metaNip05
  const [validating, setValidating] = useState(false);
  const [valid, setValid] = useState(null);

  // "Change name" form toggle
  const [editing, setEditing] = useState(false);

  // Name form state
  const [nameInput, setNameInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [skipAvailCheck, setSkipAvailCheck] = useState(false);
  const [postError, setPostError] = useState(null);

  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [publishingProfile, setPublishingProfile] = useState(false);

  const debounceRef = useRef(null);

  // Re-fetch kind:0 directly from relays on mount, bypassing NDK's cache
  useEffect(() => {
    if (!pubkey) return;
    ndkInstance
      .fetchEvent({ kinds: [0], authors: [pubkey] }, { cacheUsage: "ONLY_RELAY" })
      .then((event) => {
        if (!event) return;
        const raw = event.rawEvent ? event.rawEvent() : event;
        dispatch(setUserMetadata(getParsedAuthor(raw)));
      })
      .catch(() => { });
  }, [pubkey]);

  // Validate current metaNip05 whenever it changes
  useEffect(() => {
    if (!metaNip05 || !pubkey) { setValid(null); return; }
    setValidating(true);
    setValid(null);
    validateNip05Remote(metaNip05, pubkey)
      .then(setValid)
      .catch(() => setValid(false))
      .finally(() => setValidating(false));
  }, [metaNip05, pubkey]);

  // Seed name input:
  //   - Yakihonne meta exists → seed from meta name (Section 1 "Change name" form)
  //   - Otherwise account name → seed from account (Section 2 / Scenario 2 "Change name")
  //   - Neither → empty (claim form)
  useEffect(() => {
    setEditing(false);
    setPostError(null);
    if (metaNip05 && isYakihonne(metaNip05)) {
      setNameInput(metaNip05.split("@")[0]);
      setSkipAvailCheck(true);
    } else if (accountNip05Name) {
      setNameInput(accountNip05Name);
      setSkipAvailCheck(true);
    } else {
      setNameInput("");
      setSkipAvailCheck(false);
    }
  }, [metaNip05, accountNip05Name]);

  const handleNameChange = useCallback(
    (val) => {
      setNameInput(val);
      setAvailable(null);
      setPostError(null);
      clearTimeout(debounceRef.current);

      const originalName =
        metaNip05 && isYakihonne(metaNip05)
          ? metaNip05.split("@")[0]
          : accountNip05Name || "";

      const unchanged = val.trim() === originalName;
      setSkipAvailCheck(unchanged);
      if (!val.trim() || unchanged) return;

      debounceRef.current = setTimeout(async () => {
        setChecking(true);
        try {
          setAvailable(await isNameAvailableRemote(val.trim()));
        } catch {
          setAvailable(null);
        } finally {
          setChecking(false);
        }
      }, 500);
    },
    [metaNip05, accountNip05Name]
  );

  // Build kind:0 content from current metadata, overriding nip05
  const buildMetaContent = (nip05Address) => ({
    name: userMetadata?.name || "",
    display_name: userMetadata?.display_name || userMetadata?.displayName || "",
    picture: userMetadata?.picture || userMetadata?.image || "",
    banner: userMetadata?.banner || "",
    about: userMetadata?.about || userMetadata?.bio || "",
    lud06: userMetadata?.lud06 || "",
    lud16: userMetadata?.lud16 || "",
    website: userMetadata?.website || "",
    nip05: nip05Address,
  });

  const publishKind0 = async (nip05Address) => {
    const event = await InitEvent({
      kind: 0,
      content: JSON.stringify(buildMetaContent(nip05Address)),
      tags: [],
    });
    if (!event) throw new Error("Signing failed");
    await publishEvent(event);
    dispatch(setUserMetadata({ ...userMetadata, nip05: nip05Address }));
  };

  // ── "Change name" submit ─────────────────────────────────────────────────
  // alsoUpdateMeta: true when called from Section 1 (Yakihonne meta exists)
  // so kind:0 is updated too if the name changed.
  const handleChangeName = async ({ alsoUpdateMeta = false } = {}) => {
    const name = nameInput.trim();
    if (!name || !pubkey) return;
    setSubmitting(true);
    setPostError(null);
    try {
      await claimNip05({ name, pubkey });
      const newAddress = `${name}@yakihonne.com`;
      dispatch(
        setNostrUser({ ...(nostrUser || {}), nip05: { name, is_active: true } })
      );
      if (alsoUpdateMeta && newAddress !== metaNip05) {
        await publishKind0(newAddress);
      }
      dispatch(setToast({ type: 1, desc: t("ANip05Q") }));
      setEditing(false);
    } catch (err) {
      setPostError(
        err?.response?.data?.message || err?.response?.data?.error || t("ANip05R")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── "Activate" for current Yakihonne meta address (not verified) ─────────
  const handleActivateCurrent = async () => {
    const name = metaNip05.split("@")[0];
    setSubmitting(true);
    setPostError(null);
    try {
      await claimNip05({ name, pubkey });
      dispatch(
        setNostrUser({ ...(nostrUser || {}), nip05: { name, is_active: true } })
      );
      setValid(true);
      dispatch(setToast({ type: 1, desc: t("ANip05Q") }));
    } catch (err) {
      setPostError(
        err?.response?.data?.message || err?.response?.data?.error || t("ANip05R")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── "Activate" for account NIP05 when is_active is false ────────────────
  const handleActivateAccount = async () => {
    setSubmitting(true);
    try {
      await claimNip05({ name: accountNip05Name, pubkey });
      dispatch(
        setNostrUser({
          ...(nostrUser || {}),
          nip05: { name: accountNip05Name, is_active: true },
        })
      );
      dispatch(setToast({ type: 1, desc: t("ANip05Q") }));
    } catch (err) {
      dispatch(
        setToast({
          type: 2,
          desc: err?.response?.data?.message || t("ANip05R"),
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── "Use this address" — publish kind:0 with accountNip05Name ───────────
  const handleUseAddress = async () => {
    const address = `${accountNip05Name}@yakihonne.com`;
    setPublishingProfile(true);
    try {
      await publishKind0(address);
      dispatch(setToast({ type: 1, desc: t("ANip05W") }));
    } catch {
      dispatch(setToast({ type: 2, desc: t("ANip05U") }));
    } finally {
      setPublishingProfile(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setPostError(null);
    setAvailable(null);
    // Re-seed input to original value
    if (metaNip05 && isYakihonne(metaNip05)) {
      setNameInput(metaNip05.split("@")[0]);
      setSkipAvailCheck(true);
    } else if (accountNip05Name) {
      setNameInput(accountNip05Name);
      setSkipAvailCheck(true);
    }
  };

  // ── Reusable Yakihonne account card (Section 2 + Scenario 2) ─────────────
  // Shown when metadata NIP05 is absent or is an external (non-Yakihonne) address.
  const renderYakihonneAccountSection = () => {
    if (accountNip05Name) {
      const accountAddress = `${accountNip05Name}@yakihonne.com`;
      return (
        <div
          className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col"
          style={{ rowGap: "16px" }}
        >
          <h4>{t("ANip05M")}</h4>

          {/* Address row + Change name toggle */}
          <div
            className="fit-container fx-centered fx-gap-h round-corner box-pad-h-m box-pad-v-s"
            style={{
              backgroundColor: "var(--color-primary-bg-side)",
              border: "1px solid var(--color-divider)",
            }}
          >
            <p className="fit-container">{accountAddress}</p>
            <Button
              size="s"
              type="gray"
              label={editing ? t("AepwLlB") : t("ANip05CN")}
              onClick={editing ? cancelEdit : () => setEditing(true)}
            />
          </div>

          {/* Change name form */}
          {editing && (
            <NameForm
              nameInput={nameInput}
              onNameChange={handleNameChange}
              checking={checking}
              available={available}
              skipAvailCheck={skipAvailCheck}
              submitting={submitting}
              postError={postError}
              onSubmit={() => handleChangeName({ alsoUpdateMeta: false })}
              submitLabel={t("ANip05L")}
              t={t}
            />
          )}

          {/* Use this address / Activate */}
          {!editing && (
            <div className="fit-container fx-centered fx-end-h">
              {accountNip05Active ? (
                <Button
                  label={t("ANip05UA")}
                  type="primary"
                  size="m"
                  loading={publishingProfile}
                  onClick={handleUseAddress}
                />
              ) : (
                <Button
                  label={t("ANip05AC")}
                  type="primary"
                  size="m"
                  loading={submitting}
                  onClick={handleActivateAccount}
                />
              )}
            </div>
          )}
        </div>
      );
    }

    // No account NIP05 — show claim form
    return (
      <div
        className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col"
        style={{ rowGap: "16px" }}
      >
        <div className="fit-container fx-centered fx-col fx-start-v fx-gap-v">
          <h4>{t("ANip05D")}</h4>
          <p className="p-secondary-c p-medium">{t("ANip05V")}</p>
        </div>
        <NameForm
          nameInput={nameInput}
          onNameChange={handleNameChange}
          checking={checking}
          available={available}
          skipAvailCheck={skipAvailCheck}
          submitting={submitting}
          postError={postError}
          onSubmit={() => handleChangeName({ alsoUpdateMeta: false })}
          submitLabel={t("ANip05H")}
          t={t}
        />
      </div>
    );
  };

  // ── SCENARIO 1 — metadata NIP05 exists ───────────────────────────────────
  if (metaNip05) {
    const isYakihonneAddress = isYakihonne(metaNip05);

    return (
      <div className="fx-centered fx-col fit-container" style={{ rowGap: "16px" }}>

        {/* Section 1 — always shown: current metadata address */}
        <div
          className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col"
          style={{ rowGap: "16px" }}
        >
          <div className="fit-container fx-scattered">
            <h4>{t("ANip05D")}</h4>
            <ValidityBadge validating={validating} valid={valid} t={t} />
          </div>

          {/* Address + Used tag + action button */}
          <div
            className="fit-container fx-centered fx-gap-h round-corner box-pad-h-m box-pad-v-s"
            style={{
              backgroundColor: "var(--color-primary-bg-side)",
              border: "1px solid var(--color-divider)",
            }}
          >
            <p className="fit-container">{metaNip05}</p>
            <UsedTag t={t} />

            {/* Yakihonne address actions — only after validation resolves */}
            {isYakihonneAddress && !validating && valid === true && (
              <Button
                size="s"
                type="gray"
                label={editing ? t("AepwLlB") : t("ANip05CN")}
                onClick={editing ? cancelEdit : () => setEditing(true)}
              />
            )}
            {isYakihonneAddress && !validating && valid === false && (
              <Button
                size="s"
                type="primary"
                label={t("ANip05AC")}
                loading={submitting}
                onClick={handleActivateCurrent}
              />
            )}
          </div>

          {/* Error from Activate (no form shown in that path) */}
          {isYakihonneAddress && !editing && postError && (
            <p className="p-red-c p-medium fit-container">{postError}</p>
          )}

          {/* Change name form — Yakihonne verified + editing */}
          {isYakihonneAddress && editing && (
            <NameForm
              nameInput={nameInput}
              onNameChange={handleNameChange}
              checking={checking}
              available={available}
              skipAvailCheck={skipAvailCheck}
              submitting={submitting}
              postError={postError}
              onSubmit={() => handleChangeName({ alsoUpdateMeta: true })}
              submitLabel={t("ANip05L")}
              t={t}
            />
          )}
        </div>

        {/* Section 2 — only when meta NIP05 is NOT a Yakihonne address */}
        {!isYakihonneAddress && renderYakihonneAccountSection()}
      </div>
    );
  }

  // ── SCENARIO 2 — no metadata NIP05 ───────────────────────────────────────
  return renderYakihonneAccountSection();
}
