import axiosInstance from "@/Helpers/HTTP_Client";
import { toApiError, apiError } from "@/Helpers/ApiError";

export const askArticleAI = async (message, article) => {
  try {
    const { data } = await axiosInstance.post("/api/v1/chat/articles", {
      message,
      article,
    });
    if (!data.success)
      throw apiError({ message: data.error || "AI request failed", data });
    return data.data;
  } catch (err) {
    throw toApiError(err, "AI request failed");
  }
};
