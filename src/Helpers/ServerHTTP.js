import axios from "axios";

// The browser instance carries withCredentials and a response interceptor that
// redirects to /login, neither of which is meaningful during SSR.
const serverHttpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "yakihonne-api-key": process.env.NEXT_PUBLIC_API_KEY,
  },
  timeout: 8000,
});

export default serverHttpClient;
