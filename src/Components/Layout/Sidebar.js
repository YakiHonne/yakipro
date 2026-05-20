import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import Link from "next/link";
import Icon from "@/Components/Icon";
import { useTranslation } from "react-i18next";
import { logoutUser } from "@/Helpers/AccountInit";
import LoginSignup from "../LoginSignup";
import Button from "../UI/Button";

export default function Sidebar() {
  const { t } = useTranslation();
  const router = useRouter();
  const userKeys = useSelector((state) => state.userKeys);
  const userMetadata = useSelector((state) => state.userMetadata);

  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const settingsRef = useRef(null);

  const isActive = (path) => router.pathname === path;

  const sibarLinks = [
    {
      icon: "home",
      displayName: "Dashboard",
      activeIcon: "home-bold",
      isButton: false,
      path: "/dashboard",
    },
    {
      icon: "curation",
      displayName: "Content",
      activeIcon: "curation-bold",
      isButton: false,
      path: "/content",
    },
    {
      icon: "posts",
      displayName: "Sub plans",
      activeIcon: "posts-bold",
      isButton: false,
      path: "/sub-plans",
    },
    {
      icon: "smart-widget",
      displayName: "Manage subs",
      activeIcon: "smart-widget-bold",
      isButton: false,
      path: "/sub-management",
    },
    {
      icon: "media",
      displayName: "Media uploads",
      activeIcon: "media-bold",
      isButton: false,
      path: "/media",
    },
    {
      icon: "star",
      displayName: "Yaki Points",
      activeIcon: "star-bold",
      isButton: false,
      path: "/yaki-points",
    },
    {
      icon: "setting",
      displayName: "Settings",
      activeIcon: "setting",
      isButton: false,
      path: "/settings",
    },
    {
      icon: "plus",
      displayName: "Create content",
      activeIcon: "plus-bold",
      isButton: true,
      path: "/create-content",
    },
  ];

  const minimizeKey = (key) => {
    if (!key) return "";
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  const getConnectedAccounts = () => {
    try {
      const accounts = localStorage.getItem("yaki-accounts");
      return accounts ? JSON.parse(accounts) : [];
    } catch (err) {
      return [];
    }
  };

  const accounts = useMemo(() => getConnectedAccounts(), [userKeys]);

  useEffect(() => {
    const handleOffClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target))
        setShowSettings(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => document.removeEventListener("mousedown", handleOffClick);
  }, []);

  return (
    <>
      {showLogin && <LoginSignup exit={() => setShowLogin(false)} />}

      <aside className="nostr-sidebar-container">
        <div className="nostr-sidebar fx-centered fx-start-h fx-col fit-container">
          {/* Top Logo Section */}
          <div style={{ position: "sticky", top: 0, width: "100%" }}>
            <div className="fx-centered fx-start-h fx-gap-h fit-container box-pad-v-s">
              <Icon
                name="yakihonne-logo"
                width={128}
                height={64}
                className="pointer"
                onClick={() => router.push("/")}
              />
              <div className="round-corner border-all box-pad-h-xs p-primary-c ">
                pro
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav
            className="fit-container link-items fx-col fx-start-v"
            style={{ flex: 1 }}
          >
            {sibarLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`nav-item fx-centered fx-start-h ${isActive(link.path) ? "active-link" : "inactive-link"}`}
              >
                {link.isButton ? (
                  <Button
                    type="primary"
                    label={link.displayName}
                    leftIcon={link.icon}
                    full={true}
                  />
                ) : (
                  <>
                    <Icon
                      name={isActive(link.path) ? link.activeIcon : link.icon}
                      size={24}
                    />
                    <div className="link-label">{link.displayName}</div>
                  </>
                )}
              </Link>
            ))}
            {/* 
            <Link
              href="/sub-plans"
              className={`nav-item fx-centered fx-start-h ${isActive("/sub-plans") ? "active-link" : "inactive-link"}`}
            >
              <Icon
                name={isActive("/sub-plans") ? "posts-bold" : "posts"}
                size={24}
              />
              <div className="link-label">Subs plans</div>
            </Link>
            <Link
              href="/sub-management"
              className={`nav-item fx-centered fx-start-h ${isActive("/sub-management") ? "active-link" : "inactive-link"}`}
            >
              <Icon
                name={
                  isActive("/sub-management")
                    ? "smart-widget-bold"
                    : "smart-widget"
                }
                size={24}
              />
              <div className="link-label">Manage subs</div>
            </Link>
            {userKeys && (
              <Link href="/create-content" className="fit-container">
                <Button
                  type="primary"
                  label={"Create content"}
                  leftIcon={"plus"}
                  full={true}
                />
              </Link>
            )} */}
          </nav>

          {/* Bottom User Section */}
          <div style={{ position: "sticky", bottom: 0, width: "100%" }}>
            {userKeys ? (
              <div
                className="fx-scattered fx-col fit-container sidebar-user-settings"
                ref={settingsRef}
              >
                <div
                  className="fit-container sidebar-user-settings-button round-corner pointer"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <div
                    className="fx-centered fx-start-h pointer"
                    style={{ columnGap: "16px" }}
                  >
                    <div
                      className="user-avatar bg bg-cover "
                      style={{
                        backgroundImage: `url(${userMetadata?.picture || ""})`,
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "var(--dim-gray)",
                      }}
                    >
                      {!userMetadata?.picture && <Icon name="user" size={24} />}
                    </div>
                    <div className="mb-hide">
                      <p className="p-one-line p-bold">
                        {userMetadata?.display_name ||
                          userMetadata?.name ||
                          minimizeKey(userKeys.pub)}
                      </p>
                      <p className="gray-c p-medium p-one-line">
                        @{userMetadata?.name || minimizeKey(userKeys.pub)}
                      </p>
                    </div>
                  </div>
                </div>

                {showSettings && (
                  <div className="round-corner fx-centered fx-start-v fx-col pointer slide-left user-settings-popup">
                    <div
                      className="fit-container fx-centered fx-col fx-start-v"
                      style={{ rowGap: "0" }}
                    >
                      <div
                        className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-s nostr-navbar-link"
                        onClick={() => router.push("/settings")}
                      >
                        <Icon name="setting" />
                        <p className="gray-c">Settings</p>
                      </div>
                      <div
                        className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-s nostr-navbar-link"
                        onClick={() => {
                          logoutUser();
                          setShowSettings(false);
                        }}
                      >
                        <Icon name="logout" />
                        <p className="gray-c">Logout</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn btn-normal btn-full fx-centered"
                onClick={() => setShowLogin(true)}
              >
                <div className="link-label">Connect</div>
                <Icon name="connect" size={24} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
