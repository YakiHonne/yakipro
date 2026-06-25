import { useDispatch, useSelector } from "react-redux";
import { setIsConnected, setLoadingConnectedUser } from "@/Store/Slices/User";
import { login as apiLogin, logout as apiLogout, checkUserConnected } from "@/Endpoionts/Auth";
import { setToast } from "@/Store/Slices/Extras";

export default function useAuth() {
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);
  const loadingConnectedUser = useSelector((state) => state.loadingConnectedUser);

  const loginBackend = async (keys = userKeys) => {
    if (!keys || !keys.pub) {
      dispatch(setLoadingConnectedUser(false));
      return false;
    }

    try {
      const check = await checkUserConnected();
      if (check && check.success) {
        dispatch(setIsConnected(true));
        return true;
      }

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
    } finally {
      dispatch(setLoadingConnectedUser(false));
    }
  };

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
    loadingConnectedUser,
    loginBackend,
    logoutBackend,
  };
}
