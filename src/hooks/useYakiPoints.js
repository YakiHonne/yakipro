import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getYakiPointsStats } from "@/Endpoionts/yakiPoints";
import { chartActionKeys } from "@/Content/ActionKeys";

const chart_ = [
  { action: "flashnews_post", all_time_points: 0, last_updated: null },
  { action: "un_write", all_time_points: 0, last_updated: null },
  { action: "un_rate", all_time_points: 0, last_updated: null },
  { action: "curation_post", all_time_points: 0, last_updated: null },
  { action: "article_post", all_time_points: 0, last_updated: null },
  { action: "article_draft", all_time_points: 0, last_updated: null },
  { action: "video_post", all_time_points: 0, last_updated: null },
  { action: "bookmark", all_time_points: 0, last_updated: null },
  { action: "zap", all_time_points: 0, last_updated: null },
  { action: "reaction", all_time_points: 0, last_updated: null },
  { action: "dms", all_time_points: 0, last_updated: null },
  { action: "user_impact", all_time_points: 0, last_updated: null },
  { action: "comment_post", all_time_points: 0, last_updated: null },
];

const levelCount = (nextLevel) => {
  if (nextLevel === 1) return 0;
  return levelCount(nextLevel - 1) + (nextLevel - 1) * 4;
};

const getCurrentLevel = (points) => {
  return Math.floor((1 + Math.sqrt(1 + (100 * points) / 50)) / 2);
};

const orderChart = (array) => {
  return chart_.map((c) => array.find((item) => item.action === c.action));
};

export default function useYakiPoints() {
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);

  const [isLoaded, setIsLoaded] = useState(false);
  const [headerStats, setHeaderStats] = useState(null);
  const [chart, setChart] = useState([]);
  const [maxValueInChart, setMaxValueInChart] = useState(0);
  const [oneTimeRewardStats, setOneTimeRewardStats] = useState([]);
  const [repeatedRewardsStats, setRepeatedRewardsStats] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState("");

  const reset = () => {
    setIsLoaded(false);
    setHeaderStats(null);
    setChart([]);
    setOneTimeRewardStats([]);
    setRepeatedRewardsStats([]);
    setTiers([]);
    setCurrentTier("");
  };

  useEffect(() => {
    if (!isConnected) {
      reset();
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoaded(false);
      try {
        const data = await getYakiPointsStats();
        if (cancelled) return;

        // Endpoint failed / returned nothing. Stop the spinner instead of
        // hanging forever — the page will fall back to its empty state.
        if (!data || !data.user_stats) return;

        const { user_stats, platform_standards, tiers } = data;

        // NOTE: we intentionally do NOT gate on `user_stats.pubkey === userKeys.pub`.
        // The /stats endpoint is authenticated and always returns the current
        // session's stats, while `userKeys.pub` can legitimately differ in form
        // (npub vs hex) or lag behind during login — comparing them produced
        // false mismatches that silently dropped valid data ("zero data").

        const xp = user_stats.xp ?? 0;
        const actions = user_stats.actions || [];
        const standards = platform_standards || {};
        const tierList = tiers || [];

        const currentLevel = getCurrentLevel(xp);
        const nextLevel = currentLevel + 1;
        const toCurrentLevelPoints = levelCount(currentLevel);
        const toNextLevelPoints = levelCount(nextLevel);
        const totalPointInLevel = toNextLevelPoints - toCurrentLevelPoints;
        const inBetweenLevelPoints = xp - toCurrentLevelPoints;
        const remainingPointsToNextLevel = totalPointInLevel - inBetweenLevelPoints;

        let max = 0;
        let tempChart = [];
        for (let action of actions) {
          if (chartActionKeys.includes(action.action)) {
            if (action.all_time_points > max) max = action.all_time_points;
            tempChart.push({
              ...action,
              display_name: standards[action.action]?.display_name || action.action,
            });
          }
        }

        const tempActionKeys = tempChart.map((a) => a.action);
        const tempStats = Object.entries(standards).map(([key, val]) => {
          const user_stat = actions.find((a) => a.action === key);
          return { action: key, ...val, user_stat };
        });

        const currentTierDisplayName = tierList.find((tier) => {
          if (tier.max > -1 && tier.min <= currentLevel && tier.max >= currentLevel) return true;
          if (tier.max === -1 && tier.min <= currentLevel) return true;
          return false;
        })?.display_name || "";

        if (cancelled) return;

        setTiers(tierList);
        setCurrentTier(currentTierDisplayName);
        setOneTimeRewardStats(tempStats.filter((i) => i.cooldown === 0 && i.count > 0));
        setRepeatedRewardsStats(
          tempStats.filter((i) => i.cooldown > 0 || (i.cooldown === 0 && i.count === 0))
        );
        setChart(
          orderChart([
            ...tempChart,
            ...chart_
              .filter((a) => !tempActionKeys.includes(a.action))
              .map((a) => ({
                ...a,
                display_name: standards[a.action]?.display_name || a.action,
              })),
          ])
        );
        setMaxValueInChart(max);
        setHeaderStats({
          xp,
          consumablePoints: user_stats.current_points?.points ?? 0,
          consumablePointsLU: user_stats.current_points?.last_updated ?? null,
          currentLevel,
          nextLevel,
          toCurrentLevelPoints,
          toNextLevelPoints,
          totalPointInLevel,
          inBetweenLevelPoints,
          remainingPointsToNextLevel,
        });
      } catch (err) {
        console.error("[useYakiPoints] failed to load stats", err);
      } finally {
        // Always clear the loading state so the page never gets stuck on the
        // spinner — whether the fetch succeeded, returned nothing, was for a
        // stale account, or threw while parsing.
        if (!cancelled) setIsLoaded(true);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [userKeys, isConnected]);

  return {
    isLoaded,
    headerStats,
    chart,
    maxValueInChart,
    oneTimeRewardStats,
    repeatedRewardsStats,
    tiers,
    currentTier,
  };
}
