import { getLoginsParams } from "@/Helpers/Encryptions";
import axiosInstance from "@/Helpers/HTTP_Client";

export const login = async ({ publicKey, userKeys }) => {
  try {
    let { pubkey, password } = await getLoginsParams(publicKey, userKeys);
    if (!(pubkey && password)) return;
    const data = await axiosInstance.post("/api/v1/login", {
      password,
      pubkey,
    });
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};
export const logout = async () => {
  try {
    const data = await axiosInstance.post("/api/v1/logout");
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};
export const checkUserConnected = async () => {
  try {
    const data = await axiosInstance.get("/api/v1/online");
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};
