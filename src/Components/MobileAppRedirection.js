import { useEffect } from "react";
import { MOBILE_APP_LINKS } from "@/config/mobileApp";

/**
 * Sends the visitor straight to the right store for their device and renders
 * nothing. Imported with ssr:false because it reads window.navigator.
 */
export default function MobileAppRedirection() {
  useEffect(() => {
    // While the iOS app is in review there is nothing to send Apple/desktop
    // visitors to, so every platform goes to Play. Once iosPending flips to
    // false this returns to per-platform routing on its own.
    const target = MOBILE_APP_LINKS.iosPending
      ? MOBILE_APP_LINKS.android
      : null;

    if (target) {
      window.location.replace(target);
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("mac os"))
      window.location.replace(MOBILE_APP_LINKS.ios);
    if (ua.includes("android")) window.location.replace(MOBILE_APP_LINKS.android);
    if (ua.includes("windows")) window.location.replace(MOBILE_APP_LINKS.ios);
  }, []);

  return null;
}
