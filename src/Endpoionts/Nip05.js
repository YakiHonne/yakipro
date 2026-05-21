import axiosInstance from "@/Helpers/HTTP_Client";

export const claimNip05 = async ({ name, pubkey }) => {
  try {
    const data = await axiosInstance.post("/api/v1/user/nip05", {
      name,
      pubkey,
    });
    return data.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
