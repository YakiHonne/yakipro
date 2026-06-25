import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import useYakiPoints from "@/hooks/useYakiPoints";
import Icon from "@/Components/Icon";
import LoadingScreen from "@/Components/LoadingScreen";
import PagePlaceholder from "@/Components/PlaceholderScreens/PagePlaceholder";
import { pphValues } from "@/Content/PagesPlaceholdersValues";
import Overlay from "@/Components/Overlay";

const tiersIcons = ["bronze-tier", "silver-tier", "gold-tier", "platinum-tier"];

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const getCooldown = (userLastUpdated, cooldownTime) => {
  const diffTime =
    userLastUpdated + cooldownTime - Math.floor(Date.now() / 1000);
  return diffTime <= 0 ? 0 : Math.ceil(diffTime / 60);
};

function ProgressBar({ current, total, full = false }) {
  const pct = total > 0 ? Math.min((current * 100) / total, 100) : 0;
  return (
    <div className={full ? "progress-bar-full" : "progress-bar"}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

function ProgressCirc({
  size,
  percentage = 0,
  inversed = false,
  innerComp,
  tooltip,
}) {
  const getColor = (p) => {
    if (!inversed) {
      if (p <= 25) return "#BE0202";
      if (p <= 50) return "#FF4A4A";
      if (p <= 75) return "#F8CC0B";
      return "#00C04D";
    }
    if (p <= 25) return "#00C04D";
    if (p <= 50) return "#F8CC0B";
    if (p <= 75) return "#FF4A4A";
    return "#BE0202";
  };
  const radius = (size - 4) / 2;
  const circumference = radius * Math.PI * 2;
  const dash = (percentage * circumference) / 100;
  return (
    <div
      className={`progress-circle pointer${tooltip ? " round-icon-tooltip" : ""}`}
      data-tooltip={tooltip || ""}
      style={{ borderRadius: "50%" }}
    >
      {innerComp && <div className="label fx-centered fx-col">{innerComp}</div>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          fill="none"
          stroke="var(--color-primary-bg-side2)"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="4px"
        />
        <circle
          fill="none"
          stroke={getColor(percentage)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="4px"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeDasharray={[dash, circumference - dash]}
          strokeLinecap="round"
          style={{ transition: "all .6s" }}
        />
      </svg>
    </div>
  );
}

const TierDemo = ({ tier, exit }) => {
  const { t } = useTranslation();
  return (
    <Overlay exit={exit}>
      <div
        className="box-pad-h box-pad-v fx-centered fx-col fx-start-h"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="box-pad-h-s box-pad-v-s">
          <div className={tier.image} style={{ width: "180px" }} />
        </div>
        <div
          className="fx-centered fx-col fit-container"
          style={{ rowGap: "5px" }}
        >
          {!tier.locked && <p style={{ fontSize: "30px" }}>🎉</p>}
          {tier.locked && (
            <div className="round-icon">
              <p style={{ fontSize: "30px", filter: "grayscale(100%)" }}>🔒</p>
            </div>
          )}
          {!tier.locked && (
            <p style={{ color: "var(--color-green-main)" }}>{t("As4WVRZ")}</p>
          )}
          {tier.locked && <p className="p-secondary-c">{t("ARAXdTM")}</p>}
          <h3>{t("AdLQkic", { level: tier.min })}</h3>
          {tier.locked && (
            <div className="box-pad-h box-pad-v-s fit-container fx-centered fx-col">
              <ProgressBar
                total={tier.min}
                current={tier.currentLevel}
                full={true}
              />
              <p className="p-orange-c ">
                {t("AfDrjvB", { level: tier.min - tier.currentLevel })}
              </p>
            </div>
          )}
        </div>
        <ul>
          {tier.description.map((desc, i) => (
            <p className="p-secondary-c p-centered" key={i}>
              {desc}
            </p>
          ))}
        </ul>
        <button className="btn btn-normal btn-full" onClick={exit}>
          {t("AGLUuNR")}
        </button>
      </div>
    </Overlay>
  );
};

const PointsDesc = ({ exit }) => {
  const { t } = useTranslation();
  return (
    <Overlay exit={exit}>
      <div
        className="box-pad-h box-pad-v fx-centered fx-col fx-start-h"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="p-centered box-pad-h box-marg-s">{t("AIdLWAb")}</h3>
        <p className="p-centered p-secondary-c">{t("AIjkhSn")}</p>
        <p className="p-centered p-secondary-c">{"> " + t("A6fM6gw") + " <"}</p>
        <p className="p-centered p-secondary-c">{"> " + t("AaZQAOK") + " <"}</p>
        <p className="p-centered p-secondary-c">{"> " + t("Av0e6zQ") + " <"}</p>
        <p
          className="p-centered box-pad-h box-marg-s"
          style={{ color: "var(--color-green-main)" }}
        >
          {t("A3moqWy")}
        </p>
        <div className="fx-centered fx-col fit-container">
          <button className="btn btn-normal btn-full" onClick={exit}>
            {t("AGLUuNR")}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

export default function YakiPoints() {
  const { t } = useTranslation();
  const isConnected = useSelector((state) => state.isConnected);
  const userMetadata = useSelector((state) => state.userMetadata);

  const {
    isLoaded,
    headerStats,
    chart,
    maxValueInChart,
    oneTimeRewardStats,
    repeatedRewardsStats,
    tiers,
    currentTier,
  } = useYakiPoints();

  const [showTier, setShowTier] = useState(false);
  const [showPointsDesc, setShowPointsDesc] = useState(false);

  const actionLabels = {
    new_account: t("AjL3AJ5"),
    username: t("A7g67SU"),
    bio: t("AIAFmnp"),
    profile_picture: t("AWeQ0fR"),
    cover: t("AFMUPwE"),
    nip05: t("AOW0Bki"),
    luds: t("AviCcwU"),
    relays_setup: t("AWAKD1j"),
    topics_setup: t("AQQFa7F"),
    follow_yaki: t("AyIwX8s"),
    flashnews_post: t("AIbcFuI"),
    un_write: t("AZYR1td"),
    un_rate: t("AiUEDe3"),
    curation_post: t("AP6dp7w"),
    article_post: t("ATFKth1"),
    article_draft: t("Aweyw6L"),
    video_post: t("A5qKCQ4"),
    bookmark: t("AuOVsg9"),
    zap: t("AetoahH"),
    reaction: "Reactions",
    dms: t("AwpwbAl"),
    user_impact: t("Ag6EZcj"),
    comment_post: t("AsCfe1h"),
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        overflow: " scroll",
        padding: "24px 0",
      }}
      className="no-scrollbar"
    >
      {showTier && <TierDemo tier={showTier} exit={() => setShowTier(false)} />}
      {showPointsDesc && <PointsDesc exit={() => setShowPointsDesc(false)} />}

      <div className="fit-container fx-centered fx-start-h">
        <div
          style={{ padding: "0 16px" }}
          className="fit-container fx-centered fx-start-v"
        >
          <div
            className="fit-container fx-centered fx-col"
            style={{ rowGap: "16px" }}
          >
            {isConnected && (
              <>
                {isLoaded && headerStats && (
                  <>
                    <div className="fit-container ">
                      <h3>{t("Ae2D51K")}</h3>
                    </div>

                    <div
                      className="yp-card box-pad-h box-pad-v fx-centered fx-start-h"
                      style={{ columnGap: "24px" }}
                    >
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          minWidth: 80,
                          borderRadius: "50%",
                          backgroundImage: `url(${userMetadata?.picture || ""})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: "var(--color-primary-bg-side2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {!userMetadata?.picture && (
                          <Icon name="user" size={32} />
                        )}
                      </div>

                      <div
                        className="fit-container fx-centered fx-col fx-start-v"
                        style={{ rowGap: "8px" }}
                      >
                        <div className="fit-container fx-scattered">
                          <div
                            className="fx-centered"
                            style={{ columnGap: "8px" }}
                          >
                            <h3>{headerStats.xp}</h3>
                            <p className="p-secondary-c p-big">xp</p>
                            <h3>
                              {t("AdLQkic", { level: "" })}{" "}
                              <span className="p-orange-c">
                                {headerStats.currentLevel}
                              </span>
                            </h3>
                          </div>
                          <div
                            className="fx-centered"
                            style={{ columnGap: "4px" }}
                          >
                            {tiers.map((tier, index) => (
                              <div
                                className="round-icon-tooltip"
                                data-tooltip={tier.display_name}
                                key={index}
                                onClick={() =>
                                  setShowTier({
                                    ...tier,
                                    currentLevel: headerStats.currentLevel,
                                    image: tiersIcons[index],
                                    locked: currentTier !== tier.display_name,
                                  })
                                }
                              >
                                <div
                                  style={{
                                    width: "28px",
                                    filter:
                                      currentTier === tier.display_name
                                        ? ""
                                        : "grayscale(100%)",
                                    opacity:
                                      currentTier === tier.display_name
                                        ? 1
                                        : 0.5,
                                  }}
                                  className={tiersIcons[index]}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div
                          className="fit-container fx-centered fx-col"
                          style={{ rowGap: "4px" }}
                        >
                          <div className="fit-container fx-scattered">
                            <p className="p-secondary-c">
                              {t("AehNuZK", {
                                points: headerStats.remainingPointsToNextLevel,
                              })}
                            </p>
                            <p className="p-orange-c">
                              {t("AdLQkic", { level: headerStats.nextLevel })}
                            </p>
                          </div>
                          <ProgressBar
                            full={true}
                            total={headerStats.totalPointInLevel}
                            current={headerStats.inBetweenLevelPoints}
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      className="yp-card box-pad-h box-pad-v fx-centered fx-col"
                      style={{ rowGap: "16px" }}
                    >
                      <div className="fit-container fx-scattered">
                        <div
                          className="fx-centered"
                          style={{ columnGap: "8px" }}
                        >
                          <h3>
                            {headerStats.consumablePoints}{" "}
                            <span className="p-secondary-c">
                              / {headerStats.xp}
                            </span>
                          </h3>
                          <p className="p-secondary-c">{t("A4IGG0z")}</p>
                        </div>
                        <button
                          className="btn btn-gst btn-small"
                          onClick={() => setShowPointsDesc(true)}
                        >
                          {t("AfRZ5lx")}
                        </button>
                      </div>
                      <div
                        className="fit-container fx-centered fx-col"
                        style={{ rowGap: "6px" }}
                      >
                        <ProgressBar
                          full={true}
                          total={headerStats.xp}
                          current={headerStats.consumablePoints}
                        />
                        <div className="fit-container fx-scattered">
                          <p className="p-secondary-c ">{t("AetHYzn")}</p>
                          <p className="p-secondary-c ">
                            {t("ABcjNuL", {
                              date:
                                headerStats.xp === headerStats.consumablePoints
                                  ? "N/A"
                                  : timeAgo(
                                      new Date(
                                        headerStats.consumablePointsLU * 1000,
                                      ),
                                    ),
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className="yp-card box-pad-h box-pad-v fx-centered fx-col"
                      style={{ rowGap: "16px" }}
                    >
                      <div
                        className="fit-container fx-centered fx-end-v"
                        style={{
                          height: "30vh",
                          borderBottom: "1px solid var(--color-divider)",
                        }}
                      >
                        <div
                          className="fit-container fx-scattered fx-end-v"
                          style={{ height: "100%", padding: "0 4px" }}
                        >
                          {chart.map((item, index) => (
                            <div
                              key={item.action}
                              className={`yp-chart-col pointer${index + 4 > chart.length ? " tooltip-right" : ""}`}
                              style={{ width: `calc(100% / ${chart.length})` }}
                            >
                              <p
                                className=" p-secondary-c"
                                style={{ fontSize: "10px" }}
                              >
                                {item.all_time_points}
                              </p>
                              <div
                                className="yp-chart-bar fit-container round-corner-s"
                                style={{
                                  height: `${maxValueInChart > 0 ? (item.all_time_points * 100) / maxValueInChart : 0}%`,
                                  minHeight: "5px",
                                  backgroundColor:
                                    item.all_time_points === maxValueInChart &&
                                    maxValueInChart > 0
                                      ? "var(--color-primary-accent)"
                                      : "var(--color-primary-bg-side2)",
                                  borderBottomLeftRadius: 0,
                                  borderBottomRightRadius: 0,
                                  borderBottom: "none",
                                  position: "relative",
                                  overflow: "visible",
                                }}
                              >
                                <div className="yp-chart-tooltip">
                                  <div
                                    className="fx-centered"
                                    style={{ columnGap: "4px" }}
                                  >
                                    <p className="">{item.display_name}</p>
                                    <p className="p-secondary-c p-small">
                                      &#9679;
                                    </p>
                                    <p className="p-orange-c ">
                                      {item.all_time_points}{" "}
                                      <span className="p-secondary-c">xp</span>
                                    </p>
                                  </div>
                                  <p className="p-secondary-c p-small">
                                    {t("As6hkOH", {
                                      date: !item.last_updated
                                        ? "N/A"
                                        : timeAgo(
                                            new Date(item.last_updated * 1000),
                                          ),
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <h4 className="p-secondary-c">{t("At2CFSI")}</h4>
                    </div>

                    <div className="fit-container">
                      <p className="p-secondary-c">{t("A2Tafrd")}</p>
                    </div>
                    {oneTimeRewardStats.map((item) => (
                      <div
                        key={item.action}
                        className="yp-card fx-col fx-centered box-pad-h-m box-pad-v-s"
                        style={{ display: "flex", rowGap: "6px" }}
                      >
                        <div className="fit-container fx-scattered">
                          <p>{actionLabels[item.action] || item.action}</p>
                          <div
                            className="fx-centered"
                            style={{ columnGap: "4px" }}
                          >
                            <p className="p-orange-c">
                              {item.user_stat?.all_time_points || 0}
                              <span className="p-secondary-c">
                                {" "}
                                /{" "}
                                {item.points[0] * (item.user_stat?.count || 1)}
                              </span>
                            </p>
                            {(item.user_stat?.all_time_points || 0) ===
                              item.points[0] * (item.user_stat?.count || 1) && (
                              <Icon name="checkmark" size={16} isColored />
                            )}
                          </div>
                        </div>
                        <div
                          className="fit-container fx-centered fx-col fx-start-v"
                          style={{ rowGap: "4px" }}
                        >
                          <ProgressBar
                            full={true}
                            total={item.points[0]}
                            current={item.user_stat?.all_time_points || 0}
                          />
                          <p className="p-secondary-c ">
                            {t("ARLmGSB")}{" "}
                            <span
                              style={{
                                color:
                                  item.count - (item.user_stat?.count || 0) ===
                                  0
                                    ? "var(--color-red-main)"
                                    : "var(--color-green-main)",
                              }}
                            >
                              ({item.count - (item.user_stat?.count || 0)})
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}

                    <div className="fit-container">
                      <p className="p-secondary-c">{t("A6gfLc1")}</p>
                    </div>
                    {repeatedRewardsStats.map((item) => {
                      const cooldown = item.user_stat
                        ? getCooldown(
                            item.user_stat.last_updated,
                            item.cooldown,
                          )
                        : 0;
                      return (
                        <div
                          key={item.action}
                          className="yp-card fx-centered"
                          style={{ overflow: "visible" }}
                        >
                          <div
                            className="fit-container fx-scattered box-pad-h-m"
                            style={{ padding: "12px 16px" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                rowGap: "2px",
                              }}
                            >
                              <p>{actionLabels[item.action] || item.action}</p>
                              <p className="p-secondary-c ">
                                {actionLabels[item.action] || item.action}{" "}
                                {t("AdFp9UM")}{" "}
                                <span className="p-orange-c">
                                  {item.points[0] || 0} xp
                                </span>
                              </p>
                            </div>
                            <ProgressCirc
                              size={54}
                              percentage={
                                item.cooldown > 0
                                  ? Math.floor(
                                      (cooldown * 100) / (item.cooldown / 60),
                                    )
                                  : 100
                              }
                              inversed={item.cooldown > 0}
                              innerComp={
                                item.cooldown > 0 ? (
                                  <p className="p-secondary-c p-small">
                                    {t("ARagjJY", { time: cooldown })}
                                  </p>
                                ) : (
                                  <Icon name="infinity" size={16} />
                                )
                              }
                              tooltip={
                                item.cooldown > 0 ? t("Ap5dxlJ") : t("AwQyQTs")
                              }
                            />
                          </div>
                          <div
                            className="fx-centered fx-col box-pad-v-m box-pad-h-m"
                            style={{
                              minWidth: "max-content",
                              borderLeft: "1px solid var(--color-divider)",
                            }}
                          >
                            <h4 className="p-orange-c">
                              {item.user_stat?.all_time_points || 0}
                            </h4>
                            <p className="p-secondary-c p-small">
                              {t("A4IGG0z")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                {!isLoaded && <LoadingScreen />}
              </>
            )}

            {!isConnected && <PagePlaceholder name={pphValues.NOT_CONNECTED} />}
          </div>
        </div>
      </div>
    </div>
  );
}
