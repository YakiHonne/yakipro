import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "yakihonne-api-key": process.env.NEXT_PUBLIC_API_KEY,
  },
  withCredentials: true,
});

const PUBLIC_PATHS = new Set(["/login", "/", "/pricing", "/404"]);

let isRedirecting = false;

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isUnresponsive =
      !error?.response ||
      error?.code === "ECONNABORTED" ||
      error?.code === "ERR_NETWORK" ||
      (status >= 500 && status < 600);

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
