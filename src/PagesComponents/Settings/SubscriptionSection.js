import React, { useEffect, useState } from "react";
import useSubscription from "@/hooks/useSubscription";
import Icon from "@/Components/Icon";
import Overlay from "@/Components/Overlay";
import Spinner from "@/Components/Spinner";
import Button from "@/Components/UI/Button";
import { setForcePaywall } from "@/Store/Slices/Subscription";
import { useDispatch } from "react-redux";

// ─── Config ──────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "basic",
    price_id: "price_1TXxor8f5pgfcSH1UwpipjP6",
    name: "Basic",
    price: "9",
    sats: "18,000",
    period: "/ month",
    desc: "For writers who want to publish, monetize, and understand their audience.",
    cta: "Get Creator",
    highlighted: false,
    features: [
      { text: "Unlimited articles & notes publishing", dim: false },
      { text: "Nostr-native identity (npub / nsec)", dim: false },
      { text: "Premium content gating (NIP-63)", dim: false },
      { text: "Subscriber management", dim: false },
      { text: "Lightning paywall — no commission", dim: false },
      { text: "Creator Analytics — up to 3 months", dim: false },
      { text: "50 GB Blossom media storage", dim: false },
      { text: "AI Writing Assistant", dim: true },
      { text: "Second Reader AI (5 personas)", dim: true },
      { text: "Energy Mapper", dim: true },
    ],
  },
  {
    id: "premium",
    price_id: "price_1TXyHO8f5pgfcSH1W1jqzsuk",
    name: "Premium",
    price: "19",
    sats: "38,000",
    period: "/ month",
    desc: "For serious creators who want AI in their corner and the full analytics picture.",
    cta: "Get Pro",
    highlighted: true,
    badge: "Most popular",
    features: [
      { text: "Everything in Creator", dim: false },
      { text: "AI Writing Assistant — unlimited", dim: false },
      { text: "Second Reader AI (all 5 personas)", dim: false },
      { text: "Energy Mapper — per-sentence emotion graph", dim: false },
      { text: "Inline diff viewer — accept / reject changes", dim: false },
      { text: "Analytics — up to 3 years of history", dim: false },
      { text: "Click-through bar drill-down per note/article", dim: false },
      { text: "100 GB Blossom media storage", dim: false },
      { text: "Early access to new features", dim: false },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (ts) => {
  if (!ts) return "N/A";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const planOrder = (id) => PLANS.findIndex((p) => p.id === id);

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlanBadge({ plan }) {
  const colors = {
    free: {
      bg: "var(--color-primary-bg-side2)",
      text: "var(--color-secondary-text)",
    },
    pro: { bg: "rgba(255,167,38,0.15)", text: "var(--color-orange-main)" },
    business: {
      bg: "rgba(105,123,216,0.15)",
      text: "var(--color-primary-accent-v2)",
    },
  };
  const style = colors[plan] || colors.free;
  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.text,
        textTransform: "capitalize",
      }}
      className="border-all round-corner box-pad-h-s"
    >
      {plan}
    </span>
  );
}

function PaymentMethodIcon({ method }) {
  if (method === "lightning")
    return (
      <span className="fx-centered" style={{ columnGap: "4px" }}>
        <Icon name="bolt" size={20} />
        <span className="">Lightning</span>
      </span>
    );
  if (method === "stripe")
    return (
      <span className="fx-centered" style={{ columnGap: "4px" }}>
        <Icon name="wallet" size={20} />
        <span className="">Card</span>
      </span>
    );
  return <span className=" p-secondary-c">—</span>;
}

function SkeletonCard() {
  return (
    <div
      className="yp-card box-pad-h-m box-pad-v-m"
      style={{ display: "flex", flexDirection: "column", rowGap: "12px" }}
    >
      {[80, 60, 100].map((w, i) => (
        <div
          key={i}
          style={{
            width: `${w}%`,
            height: "14px",
            borderRadius: "8px",
            backgroundColor: "var(--color-primary-bg-side2)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

function CancelConfirmModal({ endDate, onConfirm, onClose, loading }) {
  return (
    <Overlay exit={onClose} width={440}>
      <div
        className="box-pad-h box-pad-v fx-centered fx-col"
        style={{ rowGap: "16px" }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            backgroundColor: "var(--color-red-side)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="warning" size={22} />
        </div>
        <h4 className="p-centered">Cancel subscription?</h4>
        <p className="p-secondary-c p-centered">
          Your subscription will end on <strong>{endDate}</strong>. You'll keep
          full access until then.
        </p>
        <div
          className="fit-container fx-centered"
          style={{ columnGap: "12px" }}
        >
          <Button
            size="m"
            type="gray"
            label="Keep subscription"
            onClick={onClose}
            full={true}
          />
          <Button
            size="m"
            type="red-gst"
            label={loading ? <Spinner size={14} /> : "Yes, cancel"}
            onClick={onConfirm}
            disabled={loading}
            full={true}
          />
        </div>
      </div>
    </Overlay>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function CurrentPlanCard({ status, onCancel, onResume, cancelling, resuming }) {
  const dispatch = useDispatch();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const isStripeActive =
    status.last_payment_method === "stripe" && status.active;

  return (
    <>
      {showCancelModal && (
        <CancelConfirmModal
          endDate={fmtDate(status.next_subscription)}
          loading={cancelling}
          onClose={() => setShowCancelModal(false)}
          onConfirm={async () => {
            await onCancel();
            setShowCancelModal(false);
          }}
        />
      )}

      <div
        className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col"
        style={{ rowGap: "14px" }}
      >
        <div className="fit-container fx-scattered">
          <h4>Current plan</h4>
          <PlanBadge plan={status.plan} />
        </div>

        {status.in_trial && (
          <div
            className="fit-container round-corner box-pad-h-m box-pad-v-s fx-centered"
            style={{
              backgroundColor: "rgba(105,123,216,0.1)",
              border: "1px solid var(--color-primary-accent-v2)",
              columnGap: "8px",
            }}
          >
            <p style={{ color: "var(--color-primary-accent-v2)" }}>
              Trial active — ends {fmtDate(status.trial_ends_at)}
            </p>
          </div>
        )}

        {status.cancel_at_period_end && (
          <div
            className="fit-container round-corner box-pad-h-m box-pad-v-s fx-centered"
            style={{
              backgroundColor: "var(--color-orange-side)",
              border: "1px solid var(--color-orange-main)",
              columnGap: "8px",
            }}
          >
            <p style={{ color: "var(--color-orange-main)" }}>
              Subscription ending on {fmtDate(status.next_subscription)} — will
              revert to Free
            </p>
          </div>
        )}

        {!status.cancel_at_period_end &&
          status.active &&
          status.next_subscription > 0 && (
            <div className="fit-container fx-scattered">
              <p className="p-secondary-c">Next renewal</p>
              <p>{fmtDate(status.next_subscription)}</p>
            </div>
          )}

        {status.last_payment_method && (
          <div className="fit-container fx-scattered">
            <p className="p-secondary-c">Payment method</p>
            <PaymentMethodIcon method={status.last_payment_method} />
          </div>
        )}

        {status.last_subscription > 0 && (
          <div className="fit-container fx-scattered">
            <p className="p-secondary-c">Last payment</p>
            <p>{fmtDate(status.last_subscription)}</p>
          </div>
        )}

        {status.in_trial && (
          <Button
            onClick={() => dispatch(setForcePaywall(true))}
            label="Upgrade now"
            size="m"
            full={true}
            type="primary"
          />
        )}

        {isStripeActive && (
          <>
            <div
              className="fit-container"
              style={{ borderTop: "1px solid var(--color-divider)" }}
            />
            {status.cancel_at_period_end ? (
              <div
                className="fit-container fx-centered fx-col"
                style={{ rowGap: "8px" }}
              >
                <p className="p-secondary-c p-centered">
                  Your subscription ends on {fmtDate(status.next_subscription)}.
                  Resume to keep access after that date.
                </p>
                <button
                  className={`btn ${resuming ? "btn-disabled" : "btn-normal"} fit-container`}
                  onClick={onResume}
                  disabled={resuming}
                >
                  {resuming ? <Spinner size={16} /> : "Resume subscription"}
                </button>
              </div>
            ) : (
              <div
                className="fit-container fx-centered fx-col"
                style={{ rowGap: "8px" }}
              >
                <Button
                  full={true}
                  type="red-gst"
                  size="m"
                  loading={cancelling}
                  label="Cancel subscription"
                  onClick={() => setShowCancelModal(true)}
                />
                <p className="p-secondary-c p-centered p-medium">
                  Cancelling will keep your access until the end of the current
                  billing period.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function PendingChangeCard({ status, onCancelChange, cancellingChange }) {
  if (!status.pending_plan) return null;
  return (
    <div
      className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col"
      style={{
        rowGap: "12px",
        border: "1px solid var(--color-orange-main)",
      }}
    >
      <div className="fit-container fx-scattered">
        <h4>Pending plan change</h4>
        <PlanBadge plan={status.pending_plan} />
      </div>
      <div
        className="fit-container fx-centered fx-col"
        style={{ rowGap: "6px" }}
      >
        <div className="fit-container fx-scattered">
          <p className="p-secondary-c ">Change</p>
          <div className="fx-centered" style={{ columnGap: "6px" }}>
            <PlanBadge plan={status.plan} />
            <span className="p-secondary-c">→</span>
            <PlanBadge plan={status.pending_plan} />
          </div>
        </div>
        <div className="fit-container fx-scattered">
          <p className="p-secondary-c ">Takes effect on</p>
          <p className="">{fmtDate(status.next_subscription)}</p>
        </div>
        <div className="fit-container fx-scattered">
          <p className="p-secondary-c ">Scheduled on</p>
          <p className="">{fmtDate(status.pending_plan_since)}</p>
        </div>
      </div>
      <Button
        size="m"
        type="gray"
        loading={cancellingChange}
        onClick={onCancelChange}
        full={true}
        label={"Cancel this change"}
      />
    </div>
  );
}

function ActionsCard({ status, onChangePlan, changingPlan }) {
  if (status.last_payment_method !== "stripe" || !status.active) return null;

  const hasPending = !!status.pending_plan;
  const currentPlanIdx = planOrder(status.plan);

  return (
    <div
      className="fx-centered fx-col fx-start-v fx-gap-v-l border-all round-corner-m box-pad-h-m box-pad-v-m"
      style={{ position: "relative" }}
    >
      <h4>Manage plans</h4>
      <div className="fx-centered fit-container fx-stretch fx-gap-h">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === status.plan;
          const targetIdx = planOrder(plan.id);
          const isUpgrade = targetIdx > currentPlanIdx;
          const isLoading = changingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`lp-plan-card ${!isCurrent ? "bg-main-c" : ""}`}
              style={
                isCurrent
                  ? { outline: "1px solid var(--color-primary-accent)" }
                  : {}
              }
            >
              {isCurrent && (
                <div style={{ position: "absolute", top: 16, right: 20 }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--color-primary-accent)",
                      background: "rgba(247,88,22,0.12)",
                      borderRadius: "999px",
                      padding: "2px 10px",
                    }}
                  >
                    Current plan
                  </span>
                </div>
              )}
              <div>
                <div className="lp-plan-name">{plan.name}</div>
                <div className="lp-plan-price-row">
                  <span className="lp-plan-amount">${plan.price}</span>
                  <span className="p-secondary-c">{plan.period}</span>
                </div>
                <div className="p-primary-c">
                  <span>~{plan.sats} sats / month</span>
                </div>
                <p className="lp-plan-desc">{plan.desc}</p>
              </div>
              <div className="lp-plan-divider" />
              <ul className="lp-plan-features">
                {plan.features.map((f) => (
                  <li
                    key={f.text}
                    className={`lp-plan-feature${f.dim ? " lp-plan-feature-dim" : ""}`}
                  >
                    <span className="lp-plan-feature-icon">
                      {f.dim ? "–" : "✓"}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>
              <div
                className="round-icon-tooltip"
                data-tooltip={
                  hasPending && !isCurrent
                    ? "You already have a pending change"
                    : ""
                }
              >
                <button
                  className={`lp-btn lp-btn-lg${plan.highlighted ? " lp-btn-primary" : " lp-btn-outline"}`}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    opacity: isCurrent || (hasPending && !isCurrent) ? 0.5 : 1,
                  }}
                  disabled={isCurrent || hasPending || isLoading}
                  onClick={() =>
                    !isCurrent &&
                    !hasPending &&
                    onChangePlan({
                      new_plan: plan.id,
                      new_price_id: plan.price_id,
                    })
                  }
                >
                  {isLoading ? (
                    <Spinner size={14} />
                  ) : isCurrent ? (
                    "Current plan"
                  ) : isUpgrade ? (
                    "Upgrade"
                  ) : (
                    "Downgrade"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentHistoryCard({ history }) {
  return (
    <div
      className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col fx-start-v"
      style={{ rowGap: "12px" }}
    >
      <h4>Payment history</h4>
      {!history || history.length === 0 ? (
        <p
          className="p-secondary-c  p-centered fit-container"
          style={{ padding: "16px 0" }}
        >
          No payments recorded yet
        </p>
      ) : (
        <div
          className="fit-container fx-centered fx-col"
          style={{ rowGap: "8px" }}
        >
          {[...history].reverse().map((entry, i) => (
            <div
              key={i}
              className="fit-container fx-scattered round-corner box-pad-h-m box-pad-v-s"
              style={{
                backgroundColor: "var(--color-primary-bg-side)",
                border: "1px solid var(--color-divider)",
              }}
            >
              <div className="fx-centered" style={{ columnGap: "10px" }}>
                <PlanBadge plan={entry.plan} />
                <PaymentMethodIcon method={entry.last_payment_method} />
              </div>
              <p className=" p-secondary-c">
                {fmtDate(entry.last_subscription)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SubscriptionSection() {
  const {
    status,
    loading,
    error,
    fetch,
    cancel,
    cancelling,
    resume,
    resuming,
    changePlan,
    changingPlan,
    cancelChange,
    cancellingChange,
  } = useSubscription();

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (loading) {
    return (
      <div
        className="fx-centered fx-col fit-container"
        style={{ rowGap: "16px" }}
      >
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col"
        style={{ rowGap: "12px" }}
      >
        <Icon name="warning" size={32} />
        <p className="p-secondary-c p-centered">
          Failed to load subscription data. Please try again.
        </p>
        <button className="btn btn-gst " onClick={fetch}>
          Retry
        </button>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div
      className="fx-centered fx-col fit-container"
      style={{ rowGap: "16px" }}
    >
      <CurrentPlanCard
        status={status}
        onCancel={cancel}
        onResume={resume}
        cancelling={cancelling}
        resuming={resuming}
      />
      <PendingChangeCard
        status={status}
        onCancelChange={cancelChange}
        cancellingChange={cancellingChange}
      />
      <ActionsCard
        status={status}
        onChangePlan={changePlan}
        changingPlan={changingPlan}
      />
      {status.active && status.last_payment_method && (
        <div
          className="fit-container round-corner-m box-pad-h-m box-pad-v-m"
          style={{
            background: "var(--color-orange-side)",
            display: "flex",
            columnGap: "14px",
            alignItems: "flex-start",
          }}
        >
          {/* Lamp icon */}
          <div
            style={{
              flexShrink: 0,
              width: "60px",
              height: "60px",
              borderRadius: "10px",
              background: "var(--color-primary-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary-accent)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21h6" />
              <path d="M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.16-3 5.2V17a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-2.8C7.2 13.16 6 11.22 6 9a6 6 0 0 1 6-6z" />
              <path d="M10 17h4" />
            </svg>
          </div>

          {/* Text */}
          <div className="fx-centered fx-col fx-start-v fx-gap-v">
            <h4 className="p-centered">Note:</h4>
            <p className="p-secondary-c">
              {status.last_payment_method === "lightning"
                ? "You can upgrade your plan or switch payment methods once your current billing cycle ends."
                : "Changing your payment method requires a cancellation of your current subscription, then simply resubscribe once your current billing cycle ends."}
            </p>
          </div>
        </div>
      )}
      <PaymentHistoryCard history={status.history} />
    </div>
  );
}
