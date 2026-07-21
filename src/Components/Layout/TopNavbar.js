import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { nip19 } from "nostr-tools";
import BrandIcon from "@/Components/Icon";
import Icon from "@/Components/LucideIcon";
import { logoutUser } from "@/Helpers/AccountInit";
import useYakiPoints from "@/hooks/useYakiPoints";
import LoginSignup from "../LoginSignup";

const minimizeKey = (key) => {
  if (!key) return "";
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
};

const navLinksLeft = [
  { path: "/dashboard", label: "Dashboard", icon: "chart_line" },
  { path: "/content", label: "Content", icon: "file_blank" },
];

const navLinksRight = [
  { path: "/media", label: "Media", icon: "camera" },
  { path: "/subscription", label: "Subscription", icon: "credit_card_01" },
];

function PointsCircle({ size = 32, percentage = 0, level }) {
  const radius = (size - 4) / 2;
  const circumference = radius * Math.PI * 2;
  const dash = (Math.min(percentage, 100) * circumference) / 100;
  return (
    <div className="uplift-points-circle">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          fill="none"
          stroke="var(--color-divider)"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="3px"
        />
        <circle
          fill="none"
          stroke="var(--color-primary-accent)"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="3px"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeDasharray={[dash, circumference - dash]}
          strokeLinecap="round"
          style={{ transition: "all .6s" }}
        />
      </svg>
      <div className="uplift-points-circle-level">{level ?? ""}</div>
    </div>
  );
}

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/content": "Content",
  "/media": "Media",
  "/subscription": "Subscription",
  "/yaki-points": "Yaki points",
  "/settings": "Settings",
  "/create-content": "Create content",
};

function MiniNavbar({ visible, pathname, userKeys, userMetadata, avatarRef, onAvatarClick, onReveal }) {
  const title = PAGE_TITLES[pathname] || "";
  return (
    <div
      className={`uplift-mini-navbar${visible ? " uplift-mini-navbar-visible" : ""}`}
      onClick={onReveal}
    >
      <div className="uplift-mini-logo">
        <BrandIcon name="yaki-logomark" size={22} />
      </div>

      <p className="uplift-mini-title">{title}</p>

      <div className="uplift-mini-right">
        {userKeys && (
          <div
            ref={avatarRef}
            className="uplift-avatar-btn"
            style={{ width: 28, height: 28 }}
            onClick={(e) => {
              e.stopPropagation();
              onAvatarClick();
            }}
          >
            <div
              className="bg bg-cover"
              style={{
                width: "100%",
                height: "100%",
                backgroundImage: `url(${userMetadata?.picture || ""})`,
                backgroundColor: "var(--color-primary-bg-side2)",
              }}
            >
              {!userMetadata?.picture && (
                <div className="fit-container fx-centered" style={{ height: "100%" }}>
                  <Icon name="user" size={14} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TopNavbar() {
  const router = useRouter();
  const userKeys = useSelector((state) => state.userKeys);
  const userMetadata = useSelector((state) => state.userMetadata);

  const { isLoaded, headerStats } = useYakiPoints();

  const [showLogin, setShowLogin] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [profilePos, setProfilePos] = useState({ top: 72, right: 16 });

  const avatarRef = useRef(null);
  const miniAvatarRef = useRef(null);
  const profileDropRef = useRef(null);

  const isPage = (path) => router.pathname === path;

  const lastScrollY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      if (showProfileMenu) return;
      const y = window.scrollY;
      setNavHidden(y > lastScrollY.current && y > 80);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    const handle = (e) => {
      if (
        avatarRef.current?.contains(e.target) ||
        miniAvatarRef.current?.contains(e.target) ||
        profileDropRef.current?.contains(e.target)
      ) return;
      setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const openProfileMenu = () => {
    const anchor = navHidden ? miniAvatarRef.current : avatarRef.current;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      const dropdownH = 320;
      const top = Math.min(r.bottom + 8, window.innerHeight - dropdownH - 8);
      setProfilePos({ top: Math.max(top, 56), right: window.innerWidth - r.right });
    }
    setShowProfileMenu((v) => !v);
  };

  const percentage = headerStats?.totalPointInLevel
    ? (headerStats.inBetweenLevelPoints * 100) / headerStats.totalPointInLevel
    : 0;

  return (
    <>
      {showLogin && <LoginSignup exit={() => setShowLogin(false)} />}

      <MiniNavbar
        visible={navHidden}
        pathname={router.pathname}
        userKeys={userKeys}
        userMetadata={userMetadata}
        avatarRef={miniAvatarRef}
        onAvatarClick={openProfileMenu}
        onReveal={() => setNavHidden(false)}
      />

      <nav className={`uplift-navbar${navHidden ? " uplift-navbar-hidden" : ""}`}>
        <div className="uplift-navbar-left">
          <div className="uplift-logo-btn" onClick={() => router.push("/")}>
            <BrandIcon name="yaki-logomark" size={36} />
            <span className="uplift-logo-badge">pro</span>
          </div>
        </div>

        <div className="uplift-nav-center">
          <div className="uplift-nav-pill">
            {navLinksLeft.map((link) => (
              <div
                key={link.path}
                className={`uplift-nav-icon-btn${isPage(link.path) ? " uplift-active" : ""}`}
                aria-label={link.label}
                onClick={() => router.push(link.path)}
              >
                <span className="uplift-nav-icon-wrap">
                  <Icon name={link.icon} size={20} v={2} opacity={1} />
                </span>
                {isPage(link.path) && <span className="uplift-active-dot" />}
              </div>
            ))}

            <button
              className="uplift-plus-btn"
              aria-label="Create content"
              onClick={() => router.push("/create-content")}
            >
              <span className="uplift-plus-icon-wrap">
                <Icon name="add_plus" size={20} v={2} opacity={1} />
              </span>
            </button>

            {navLinksRight.map((link) => (
              <div
                key={link.path}
                className={`uplift-nav-icon-btn${isPage(link.path) ? " uplift-active" : ""}`}
                aria-label={link.label}
                onClick={() => router.push(link.path)}
              >
                <span className="uplift-nav-icon-wrap">
                  <Icon name={link.icon} size={20} v={2} opacity={1} />
                </span>
                {isPage(link.path) && <span className="uplift-active-dot" />}
              </div>
            ))}
          </div>
        </div>

        <div className="uplift-nav-right">
          {userKeys && (
            <div
              className="uplift-points-chip"
              onClick={() => router.push("/yaki-points")}
            >
              <PointsCircle percentage={percentage} level={isLoaded ? headerStats?.currentLevel : ""} />
              <p className="uplift-points-xp">{isLoaded ? headerStats?.xp ?? 0 : "—"}</p>
              <p className="uplift-points-label">Yaki points</p>
            </div>
          )}

          {userKeys ? (
            <div ref={avatarRef} className="uplift-avatar-btn" onClick={openProfileMenu}>
              <div
                className="bg bg-cover"
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundImage: `url(${userMetadata?.picture || ""})`,
                  backgroundColor: "var(--color-primary-bg-side2)",
                }}
              >
                {!userMetadata?.picture && (
                  <div className="fit-container fx-centered" style={{ height: "100%" }}>
                    <Icon name="user" size={20} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button className="uplift-login-btn" onClick={() => setShowLogin(true)}>
              Connect
            </button>
          )}
        </div>
      </nav>

      {showProfileMenu && userKeys && typeof document !== "undefined" && createPortal(
        <>
          <div className="uplift-profile-scrim" onClick={() => setShowProfileMenu(false)} />
          <div
            ref={profileDropRef}
            className="uplift-profile-dropdown-wrapper"
            style={{ top: profilePos.top, right: profilePos.right }}
          >
            <div
              className="uplift-dropdown-item"
              onClick={() => {
                setShowProfileMenu(false);
                try {
                  const npub = nip19.npubEncode(userKeys.pub);
                  window.open(
                    `https://yakihonne.com/${npub}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                } catch (err) {
                  console.error("[TopNavbar] failed to open profile", err);
                }
              }}
            >
              <Icon name="user_01" v={2} size={18} />
              <span className="uplift-dropdown-profile-name">
                Profile
                <span className="gray-c">
                  {" @"}{userMetadata?.name || userMetadata?.display_name || minimizeKey(userKeys.pub)}
                </span>
              </span>
            </div>

            <div
              className="uplift-dropdown-item"
              onClick={() => {
                setShowProfileMenu(false);
                router.push("/sub-and-usage");
              }}
            >
              <Icon name="credit_card_01" v={2} size={18} />
              <span>Subscription &amp; usage</span>
            </div>

            <div
              className="uplift-dropdown-item"
              onClick={() => {
                setShowProfileMenu(false);
                router.push("/yaki-points");
              }}
            >
              <Icon name="star" v={2} size={18} />
              <span>Yaki points</span>
            </div>

            <div
              className="uplift-dropdown-item"
              onClick={() => {
                setShowProfileMenu(false);
                router.push("/settings");
              }}
            >
              <Icon name="settings" v={2} size={18} />
              <span>Settings</span>
            </div>

            <div className="uplift-dropdown-divider" />

            <div
              className="uplift-dropdown-item"
              onClick={() => {
                setShowProfileMenu(false);
                logoutUser();
              }}
            >
              <Icon name="logout" size={18} />
              <span>Logout</span>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
