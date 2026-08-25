/**
 * Every mobile-app URL and asset lives here so swapping YakiHonne's links for
 * YakiPro's is a single edit. Nothing below is inlined anywhere else.
 *
 * The store, Zapstore and GitHub links are YakiPro's own. The iOS link and the
 * promo video are still YakiHonne's, kept as placeholders until the YakiPro
 * app clears App Store review and a YakiPro promo exists.
 */
export const MOBILE_APP_LINKS = {
  // The iOS app is still in App Store review. The button stays visible but
  // disabled, and the redirection page sends everyone to Play until it lands.
  iosPending: true,
  ios: "https://apps.apple.com/mo/app/yakihonne/id6472556189?l=en-GB",
  android: "https://play.google.com/store/apps/details?id=com.yakihonne.pro",
  zapstore: "https://zapstore.dev/apps/com.yakihonne.pro",
  github: "https://github.com/YakiHonne/mobile-pro-app",
  // Kept for a future "Read more" entry point; nothing links to it today.
  readMore: "/yakipro-mobile-app",
  qr: "https://yakihonne.s3.ap-east-1.amazonaws.com/media/images/yakipro-mobile-apps-links.png",
  // Still YakiHonne's promo. The video block is hidden until a YakiPro one
  // exists; flip SHOW_PROMO_VIDEO in MobileDemo.js to bring it back.
  promoVideo:
    "https://yakihonne.s3.ap-east-1.amazonaws.com/videos/yakihonne-mobile-app-promo-2.mp4",
};
