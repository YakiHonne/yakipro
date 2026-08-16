import axiosInstance from "@/Helpers/HTTP_Client";
import { toApiError, apiError } from "@/Helpers/ApiError";

export const analyzeFullArticle = async (article, personaId) => {
  try {
    const { data } = await axiosInstance.post(
      "/api/v1/chat/second-reader/full",
      { article, personaId },
    );
    if (!data.success)
      throw apiError({ message: data.error || "Analysis failed", data });
    return data.data;
  } catch (err) {
    throw toApiError(err, "Analysis failed");
  }
};

export const analyzeParagraph = async (
  paragraph,
  contextBefore,
  contextAfter,
  personaId,
) => {
  try {
    const { data } = await axiosInstance.post(
      "/api/v1/chat/second-reader/paragraph",
      { paragraph, contextBefore, contextAfter, personaId },
    );
    if (!data.success)
      throw apiError({
        message: data.error || "Paragraph analysis failed",
        data,
      });
    return data.data;
  } catch (err) {
    throw toApiError(err, "Paragraph analysis failed");
  }
};
