export const REASON_UPGRADE_REQUIRED = "upgrade_required";
export const REASON_QUOTA_EXCEEDED = "quota_exceeded";
export const REASON_TRIAL = "trial";
export const REASON_TAKEN = "taken";
export const REASON_ALREADY_SET = "already_set";

export function toApiError(err, fallbackMessage = "Request failed") {
  if (err?.isApiError) return err;

  const response = err?.response;
  const body = response?.data || {};
  const error = new Error(
    body.error || body.message || err?.message || fallbackMessage,
  );

  error.isApiError = true;
  error.status = response?.status ?? null;
  error.reason = body.reason ?? null;
  error.plan = body.plan ?? null;
  error.limit = body.limit ?? null;
  error.data = body;
  error.cause = err;

  return error;
}

export function apiError({ message, status = null, reason = null, data = {} }) {
  const error = new Error(message);
  error.isApiError = true;
  error.status = status;
  error.reason = reason;
  error.plan = data.plan ?? null;
  error.limit = data.limit ?? null;
  error.data = data;
  return error;
}

export const isUpgradeRequired = (err) =>
  err?.reason === REASON_UPGRADE_REQUIRED || err?.status === 403;

export const isQuotaExceeded = (err) =>
  err?.reason === REASON_QUOTA_EXCEEDED || err?.status === 429;

export const isTrialBlocked = (err) => err?.reason === REASON_TRIAL;

export const isAccessFailure = (err) =>
  isTrialBlocked(err) || isQuotaExceeded(err) || isUpgradeRequired(err);
