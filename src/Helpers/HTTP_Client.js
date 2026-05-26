import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "yakihonne-api-key": process.env.NEXT_PUBLIC_API_KEY,
  },
  withCredentials: true,
});

// Public pages that should never trigger an auto-redirect to /login
const PUBLIC_PATHS = new Set(["/login", "/", "/pricing", "/404"]);

// Module-level guard so concurrent failing requests don't fire multiple redirects
let isRedirecting = false;

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isUnresponsive =
      !error?.response ||                          // no response received
      error?.code === "ECONNABORTED" ||            // request timed out
      error?.code === "ERR_NETWORK" ||             // network failure
      (status >= 500 && status < 600);             // server error

    if (
      isUnresponsive &&
      typeof window !== "undefined" &&
      !PUBLIC_PATHS.has(window.location.pathname) &&
      !isRedirecting
    ) {
      isRedirecting = true;
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
