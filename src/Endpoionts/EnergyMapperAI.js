import axiosInstance from "@/Helpers/HTTP_Client";

/**
 * Analyzes the emotional energy of each sentence in a note.
 * @param {string} noteText - Plain text of the note
 * @returns {Promise<{
 *   sentences: Array<{index: number, text: string, energy: number, label: string, reason: string}>,
 *   summary: string,
 *   peak: number,
 *   flatlines: number[]
 * }>}
 */
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
