import axios from "axios";

// No response interceptor and no instance-wide timeout, both on purpose. A
// redirect to /login on any 5xx or network error turned one transient failure
// into a full reload of the app, and uploads and AI calls legitimately run far
// longer than a startup request should — callers that must not hang pass their
// own `timeout`.
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "yakihonne-api-key": process.env.NEXT_PUBLIC_API_KEY,
  },
  withCredentials: true,
});

export default axiosInstance;
