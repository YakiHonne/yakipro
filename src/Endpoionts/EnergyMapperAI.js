import axiosInstance from "@/Helpers/HTTP_Client";

export async function analyzeNoteEnergy(noteText) {
  try {
    const { data } = await axiosInstance.post("/api/v1/chat/energy-mapper", {
      note: noteText,
    });
    if (!data.success) throw new Error(data.error || "Energy analysis failed");
    return data.data;
  } catch (err) {
    throw new Error(
      err?.response?.data?.error || err.message || "Energy analysis failed",
    );
  }
}
