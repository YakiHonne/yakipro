import { useDispatch, useSelector } from "react-redux";
import { setIsConnected } from "@/Store/Slices/User";
import { login as apiLogin, logout as apiLogout, checkUserConnected } from "@/Endpoionts/Auth";
import { setToast } from "@/Store/Slices/Extras";

export default function useAuth() {
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);

  /**
   * Connects the current Nostr user to the backend.
   */
  const loginBackend = async (keys = userKeys) => {
    if (!keys || !keys.pub) return false;

    try {
      // 1. Check if already connected
      const check = await checkUserConnected();
      if (check && check.success) {
        dispatch(setIsConnected(true));
        return true;
      }

      // 2. Perform backend login
      const res = await apiLogin({ publicKey: keys.pub, userKeys: keys });
      if (res && res.success) {
        dispatch(setIsConnected(true));
        return true;
      }
      
      dispatch(setIsConnected(false));
      return false;
    } catch (err) {
      console.error("[useAuth] Backend login error:", err);
      dispatch(setIsConnected(false));
      return false;
    }
  };

  /**
   * Logs out from the backend.
   */
  const logoutBackend = async () => {
    try {
      await apiLogout();
      dispatch(setIsConnected(false));
    } catch (err) {
      console.error("[useAuth] Backend logout error:", err);
    }
  };

  return {
    isConnected,
    loginBackend,
    logoutBackend,
  };
}
