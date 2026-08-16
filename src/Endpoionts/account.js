import axiosInstance from "@/Helpers/HTTP_Client";
import { toApiError, apiError } from "@/Helpers/ApiError";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_PATTERN = /^[a-z0-9_-]+$/;

export const validateUsername = (value) => {
  const username = (value || "").trim().toLowerCase();
  if (!username) return "empty";
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX)
    return "length";
  if (!USERNAME_PATTERN.test(username)) return "charset";
  return null;
};

export const normalizeToUsername = (value) => {
  const normalized = (value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, USERNAME_MAX);
  return normalized.length >= USERNAME_MIN ? normalized : "";
};

// The three names live in separate namespaces, so each field must probe its own
// endpoint — pointing them all at the username route reports a nip05 the user
// already owns as freely available.
export const checkUsernameAvailability = async (username, config) => {
  const { data } = await axiosInstance.get(
    `/api/v1/user/username-availability/${encodeURIComponent(username)}`,
    config,
  );
  return data;
};

export const checkNip05Availability = async (name, config) => {
  const { data } = await axiosInstance.get(
    `/api/v1/user/nip05-availability/${encodeURIComponent(name)}`,
    config,
  );
  return data;
};

export const checkWalletAvailability = async (name, config) => {
  const { data } = await axiosInstance.get(
    `/api/v1/user/wallet-availability/${encodeURIComponent(name)}`,
    config,
  );
  return data;
};

export const AVAILABILITY_CHECKS = {
  username: checkUsernameAvailability,
  nip05: checkNip05Availability,
  wallet: checkWalletAvailability,
};

export const resolveUsername = async (username) => {
  const { data } = await axiosInstance.get(
    `/api/v1/user/username/${encodeURIComponent(username)}`,
  );
  return data;
};

export const claimUsername = async (username) => {
  try {
    const { data } = await axiosInstance.post("/api/v1/user/username", {
      username,
    });
    return data;
  } catch (err) {
    throw toApiError(err, "Could not claim this username");
  }
};

export const claimNip05 = async ({ name, pubkey }) => {
  try {
    const { data } = await axiosInstance.post("/api/v1/user/nip05", {
      name,
      pubkey,
    });
    return data;
  } catch (err) {
    throw toApiError(err, "Could not claim this nip05 name");
  }
};

// The route pipes the external wallet service's response through unchanged, so a
// 2xx body without lightningAddress is a failure wearing a success status code.
export const createWallet = async (username) => {
  try {
    const { data } = await axiosInstance.post("/api/v1/wallet", { username });
    if (!data?.lightningAddress)
      throw apiError({
        message: data?.message || "Could not create this wallet.",
        status: 409,
        data: data || {},
      });
    return data;
  } catch (err) {
    throw toApiError(err, "Could not create this wallet.");
  }
};

export const markOnboarded = async () => {
  try {
    const { data } = await axiosInstance.post("/api/v1/user/onboarded");
    return data;
  } catch (err) {
    throw toApiError(err, "Could not complete onboarding");
  }
};
