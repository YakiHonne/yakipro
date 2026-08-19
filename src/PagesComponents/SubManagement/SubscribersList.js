import useGatewayAccess from "@/hooks/useGatewayAccess";
import usePlans from "@/hooks/usePlans";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/Components/UI/Button";
import { SelectTabs } from "@/Components/SelectTabs";
import DeleteWarning from "@/Components/DeleteWarning";
import UserRow from "@/Components/UserRow";
import Spinner from "@/Components/Spinner";
import Icon from "@/Components/LucideIcon";
import Overlay from "@/Components/Overlay";
import useUserProfile from "@/hooks/useUserProfile";
import { getCreatorPaymentHistory } from "@/Endpoionts/subscription";
import AddSubscriberOverlay from "./AddSubscriberOverlay";

const fmtPaymentDate = (ts) => {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const fmtAmount = (amount, currency, locale) => {
  const code = (currency || "").toLowerCase();
  if (typeof amount !== "number" || (!amount && !code)) return "—";
  if (code === "sats") return `${amount} sats`;
  if (!code) return String(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code.toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount} ${code.toUpperCase()}`;
  }
};

const fmtMethodKey = (payment) => {
  if (payment?.provider === "lightning") return "Aw2Fq8n";
  if (payment?.provider === "stripe") return "Ak7Dv3p";
  return (payment?.payment_method || "").toLowerCase() === "lightning"
    ? "Aw2Fq8n"
    : "Ak7Dv3p";
};

const DISPLAY_STATUS = {
  active: { key: "Amt1sHd", sticker: "sticker-gst-green" },
  canceling: { key: "Ac4Tn7q", sticker: "sticker-gst-orange" },
  canceled: { key: "Ax9Vb2m", sticker: "sticker-gst-red" },
  past_due: { key: "Ap3Lw6d", sticker: "sticker-gst-red" },
  incomplete: { key: "Ai8Zr4k", sticker: "sticker-gst-orange" },
  expired: { key: "Ae5Hy1j", sticker: "sticker-gst-gray" },
};

function PaidByUser({ pubkey, size = 24 }) {
  const { userProfile } = useUserProfile(pubkey);
  return (
    <div className="fx-centered fx-gap-h-m">
      <div
        className="bg-cover"
        style={{
          backgroundImage: `url(${userProfile.picture || ""})`,
          backgroundColor: "var(--color-divider)",
          borderRadius: "50%",
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        {!userProfile.picture && (
          <div className="fx-centered" style={{ width: "100%", height: "100%" }}>
            <Icon name="user" size={size / 2} />
          </div>
        )}
      </div>
      <p className="p-medium p-one-line">{userProfile.display_name}</p>
    </div>
  );
}

function PaymentRow({ payment, locale, t }) {
  return (
    <div className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-s fx-scattered">
      <div className="fx-col fx-start-v" style={{ gap: 0 }}>
        <p className="p-bold p-one-line">
          {fmtAmount(payment?.amount, payment?.currency, locale)}
        </p>
        <p className="gray-c p-medium p-one-line">
          {fmtPaymentDate(payment?.subscribed_at)}
        </p>
      </div>
      <div className="fx-centered fx-gap-h-m">
        <p className="gray-c p-medium p-one-line">{t("Ab3Yn7w")}</p>
        <PaidByUser pubkey={payment?.subscriber_pubkey} />
      </div>
      <div className="fx-centered fx-gap-h-m">
        <div className="sticker sticker-small sticker-gst-orange">
          {t(fmtMethodKey(payment))}
        </div>
        <div
          className={`sticker sticker-small ${
            payment?.status === "paid"
              ? "sticker-gst-green"
              : "sticker-gst-red"
          }`}
        >
          {payment?.status === "paid" ? t("Ap6Kv1w") : t("Af2Ns8h")}
        </div>
      </div>
    </div>
  );
}

function SubscriberDetailsOverlay({ pubkey, subscriber, locale, t, exit }) {
  const { userProfile } = useUserProfile(pubkey);
  const status =
    DISPLAY_STATUS[subscriber?.display_status] || DISPLAY_STATUS.expired;
  const history = subscriber?.history || [];

  return (
    <Overlay exit={exit} width={520}>
      <div className="fx-col fx-gap-v box-pad-h box-pad-v relative">
        <div
          className="close"
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 10,
          }}
          onClick={exit}
        >
          <div />
        </div>
        <div className="fit-container fx-col fx-centered fx-gap-v-m box-pad-v-m">
          <div
            className="bg-cover"
            style={{
              backgroundImage: `url(${userProfile.picture || ""})`,
              backgroundColor: "var(--color-divider)",
              borderRadius: "50%",
              width: 72,
              height: 72,
            }}
          >
            {!userProfile.picture && (
              <div
                className="fx-centered"
                style={{ width: "100%", height: "100%" }}
              >
                <Icon name="user" size={36} />
              </div>
            )}
          </div>
          <h4 className="p-one-line">{userProfile.display_name}</h4>
          <div className={`sticker sticker-small ${status.sticker}`}>
            {t(status.key)}
          </div>
        </div>
        <div className="fit-container fx-col fx-gap-v-m">
          <div className="fit-container fx-scattered">
            <p className="gray-c p-medium">{t("Aq7Wd2n")}</p>
            <p className="p-bold">
              {fmtAmount(subscriber?.amount, subscriber?.currency, locale)}
            </p>
          </div>
          {subscriber?.last_subscription > 0 && (
            <div className="fit-container fx-scattered">
              <p className="gray-c p-medium">{t("Ag5Rt8c")}</p>
              <p className="p-medium">
                {fmtPaymentDate(subscriber.last_subscription)}
              </p>
            </div>
          )}
          {subscriber?.display_status === "canceling" &&
          subscriber?.cancel_at > 0 ? (
            <div className="fit-container fx-scattered">
              <p className="gray-c p-medium">{t("An2Qs9v")}</p>
              <p className="p-medium">
                {fmtPaymentDate(subscriber.cancel_at)}
              </p>
            </div>
          ) : (
            subscriber?.next_subscription > 0 && (
              <div className="fit-container fx-scattered">
                <p className="gray-c p-medium">{t("Az6Mb4t")}</p>
                <p className="p-medium">
                  {fmtPaymentDate(subscriber.next_subscription)}
                </p>
              </div>
            )
          )}
          {history.length > 0 && (
            <div className="fit-container fx-scattered">
              <p className="gray-c p-medium">{t("Amk3Rzv")}</p>
              <div className="sticker sticker-small sticker-gst-orange">
                {t(fmtMethodKey(history[0]))}
              </div>
            </div>
          )}
        </div>
        {history.length > 0 && (
          <div className="fit-container fx-col fx-gap-v-m box-pad-v-m border-top">
            <h4>{t("Au4Wj6q")}</h4>
            {history.map((payment, index) => (
              <div
                className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-s fx-scattered"
                key={`${payment?.invoice_id || payment?.provider}-${
                  payment?.subscribed_at
                }-${index}`}
              >
                <div className="fx-col fx-start-v" style={{ gap: 0 }}>
                  <p className="p-bold p-one-line">
                    {fmtAmount(payment?.amount, payment?.currency, locale)}
                  </p>
                  <p className="gray-c p-medium p-one-line">
                    {fmtPaymentDate(payment?.subscribed_at)}
                  </p>
                </div>
                <div className="fx-centered fx-gap-h-m">
                  <div className="sticker sticker-small sticker-gst-orange">
                    {t(fmtMethodKey(payment))}
                  </div>
                  <div
                    className={`sticker sticker-small ${
                      payment?.status === "paid"
                        ? "sticker-gst-green"
                        : "sticker-gst-red"
                    }`}
                  >
                    {payment?.status === "paid" ? t("Ap6Kv1w") : t("Af2Ns8h")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  );
}

function DelegatedSubscriberRow({ pubkey, subscriber, t, onDetails }) {
  const status = subscriber
    ? DISPLAY_STATUS[subscriber.display_status] || DISPLAY_STATUS.expired
    : null;

  return (
    <UserRow pubkey={pubkey}>
      <div className="fx-centered fx-end-h fx-gap-h">
        {status && (
          <div className={`sticker sticker-small ${status.sticker}`}>
            {t(status.key)}
          </div>
        )}
        {subscriber && (
          <Button
            label={t("Ad9Kp2s")}
            type="gray"
            size="s"
            onClick={onDetails}
          />
        )}
      </div>
    </UserRow>
  );
}

export default function SubscribersList() {
  const { t, i18n } = useTranslation();
  const {
    accessEvent,
    followList,
    isLoading,
    publishGatewayAccess,
    directSubscribers,
    removeDirectSubscriber,
    addDirectSubscriber,
  } = useGatewayAccess(process.env.NEXT_PUBLIC_GATEWAY_PUBKEY);
  const { plans } = usePlans();
  const [tab, setTab] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [showAddSubscriber, setShowAddSubscriber] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paidSubscribers, setPaidSubscribers] = useState([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [isPaymentsLoaded, setIsPaymentsLoaded] = useState(false);
  const paymentsRequestRef = useRef(false);
  const [detailsPubkey, setDetailsPubkey] = useState(null);

  const subscribersByPubkey = useMemo(() => {
    const map = {};
    for (const subscriber of paidSubscribers) {
      if (subscriber?.subscriber_pubkey)
        map[subscriber.subscriber_pubkey] = subscriber;
    }
    return map;
  }, [paidSubscribers]);

  useEffect(() => {
    if ((tab !== 0 && tab !== 2) || isPaymentsLoaded || paymentsRequestRef.current)
      return;
    paymentsRequestRef.current = true;
    const fetchPayments = async () => {
      setIsPaymentsLoading(true);
      try {
        const data = await getCreatorPaymentHistory();
        setPayments(data?.payments || []);
        setPaidSubscribers(data?.subscribers || []);
      } catch {
        setPayments([]);
        setPaidSubscribers([]);
      } finally {
        setIsPaymentsLoading(false);
        setIsPaymentsLoaded(true);
      }
    };
    fetchPayments();
  }, [tab, isPaymentsLoaded]);

  return (
    <>
      {detailsPubkey && subscribersByPubkey[detailsPubkey] && (
        <SubscriberDetailsOverlay
          pubkey={detailsPubkey}
          subscriber={subscribersByPubkey[detailsPubkey]}
          locale={i18n.language}
          t={t}
          exit={() => setDetailsPubkey(null)}
        />
      )}
      {showAddSubscriber && (
        <AddSubscriberOverlay
          exit={() => setShowAddSubscriber(false)}
          onAdd={addDirectSubscriber}
          existingPubkeys={(directSubscribers || []).map((s) => s.pubkey)}
        />
      )}
      {toDelete && (
        <DeleteWarning
          title={t("AAUycZW")}
          description={t("AQIAfYS")}
          exit={() => {
            setToDelete(null);
          }}
          handleDelete={() => {
            setToDelete(null);
            removeDirectSubscriber(toDelete);
          }}
          actionButtonLabel={t("AvEJw6B")}
        />
      )}
      <div className="fit-container box-pad-h-m box-pad-v-m fx-gap-v-m fx-col no-scrollbar">
        <div className="fx-scattered">
          <h3 className="p-primary-c">{t("A2mdxcf")}</h3>
        </div>
        <div className="fx-scattered fit-container">
          <div>
            <SelectTabs
              tabs={[t("AH90wGL"), t("A14HHPP"), t("Apy4Hst")]}
              selectedTab={tab}
              setSelectedTab={setTab}
            />
          </div>
          {tab === 1 && (
            <Button
              leftIcon={"plus"}
              type="primary"
              label={t("A6rkFum")}
              onClick={() => setShowAddSubscriber(true)}
            />
          )}
        </div>
        {tab === 0 && (
          <>
            {!(plans.isFiatEnable && plans.isLnEnabled) && !accessEvent && (
              <div className="fit-container fx-col fx-centered fx-gap-v box-pad-h box-pad-v round-corner-m border-all">
                <h3>{t("A65LO6w")}</h3>
                <p className="p-secondary-c p-centered box-pad-h-m">
                  {t("Ayh5F4w")}
                </p>
                <Button
                  label={t("A7noclE")}
                  type="primary"
                  size="m"
                  onClick={publishGatewayAccess}
                  loading={isLoading}
                />
              </div>
            )}
            {(!followList || followList?.length === 0) && accessEvent && (
              <div className="fit-container fx-col fx-centered fx-gap-v box-pad-h box-pad-v round-corner-m border-all">
                <h3>{t("AQG30hM")}</h3>
                <p className="p-secondary-c p-centered box-pad-h-m">
                  {t("AcPmGuk")}
                </p>
              </div>
            )}

            {followList && followList.length > 0 && (
              <div className="fx-col fx-gap-v fit-container">
                {followList.map((pubkey) => (
                  <DelegatedSubscriberRow
                    key={pubkey}
                    pubkey={pubkey}
                    subscriber={subscribersByPubkey[pubkey]}
                    t={t}
                    onDetails={() => setDetailsPubkey(pubkey)}
                  />
                ))}
              </div>
            )}
          </>
        )}
        {tab === 1 && (
          <>
            {directSubscribers && directSubscribers.length > 0 && (
              <div className="fx-col fx-gap-v fit-container">
                {directSubscribers.map((pubkey) => (
                  <UserRow
                    key={pubkey.pubkey}
                    pubkey={pubkey.pubkey}
                    remove={() => setToDelete(pubkey.id)}
                  />
                ))}
              </div>
            )}
            {directSubscribers && directSubscribers.length === 0 && (
              <div className="fit-container fx-col fx-centered fx-gap-v box-pad-h box-pad-v round-corner-m border-all">
                <h3>{t("AQG30hM")}</h3>
                <p className="p-secondary-c p-centered box-pad-h-m">
                  {t("AcPmGuk")}
                </p>
              </div>
            )}
          </>
        )}
        {tab === 2 && (
          <>
            {isPaymentsLoading && (
              <div className="fit-container fx-centered box-pad-v">
                <Spinner />
              </div>
            )}
            {!isPaymentsLoading && payments.length > 0 && (
              <div className="fx-col fx-gap-v fit-container">
                {payments.map((payment, index) => (
                  <PaymentRow
                    key={`${payment?.invoice_id || payment?.provider}-${
                      payment?.subscriber_pubkey
                    }-${payment?.subscribed_at}-${index}`}
                    payment={payment}
                    locale={i18n.language}
                    t={t}
                  />
                ))}
              </div>
            )}
            {!isPaymentsLoading && payments.length === 0 && (
              <div className="fit-container fx-col fx-centered fx-gap-v box-pad-h box-pad-v round-corner-m border-all">
                <h3>{t("AQG30hM")}</h3>
                <p className="p-secondary-c p-centered box-pad-h-m">
                  {t("AcPmGuk")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
