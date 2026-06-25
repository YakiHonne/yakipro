import axiosInstance from "@/Helpers/HTTP_Client";

export const getAllowedRelays = async () => {
  try {
    const data = await axiosInstance.get(`/api/v1/allowed-relays`);
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};
export const addAllowedRelays = async ({
  relays_list,
  delegated_relay,
  delegated_relay_access_code,
}) => {
  try {
    const data = await axiosInstance.post(`/api/v1/allowed-relays`, {
      relays_list,
      delegated_relay,
      delegated_relay_access_code,
    });
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const getPremiumRelayInviteCode = async () => {
  try {
    const { data } = await axiosInstance.get(
      `/api/v1/premium-relay/invite-code`,
    );
    return data.code;
  } catch (err) {
    if (err?.response?.status === 404) {
      return null;
    }
    console.log(err);
    return false;
  }
};
