import axiosInstance from "@/Helpers/HTTP_Client";

export const getYakiPointsStats = async () => {
  try {
    const data = await axiosInstance.get("/api/v1/yaki-chest/stats");
    return data.data;
  } catch (err) {
    console.log(err);
    return null;
  }
};
