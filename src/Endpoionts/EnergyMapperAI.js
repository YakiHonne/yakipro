import axiosInstance from "@/Helpers/HTTP_Client";
import { toApiError, apiError } from "@/Helpers/ApiError";

export async function analyzeNoteEnergy(noteText) {
  try {
    const { data } = await axiosInstance.post("/api/v1/chat/energy-mapper", {
      note: noteText,
    });
    if (!data.success)
      throw apiError({ message: data.error || "Energy analysis failed", data });
    return data.data;
  } catch (err) {
    throw toApiError(err, "Energy analysis failed");
  }
}
