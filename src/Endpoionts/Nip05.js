import axiosInstance from "@/Helpers/HTTP_Client";
import { toApiError } from "@/Helpers/ApiError";

export const claimNip05 = async ({ name, pubkey }) => {
  try {
    const data = await axiosInstance.post("/api/v1/user/nip05", {
      name,
      pubkey,
    });
    return data.data;
  } catch (err) {
    throw toApiError(err, "Could not claim this nip05 name");
  }
};
