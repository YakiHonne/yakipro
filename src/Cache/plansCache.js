import { registerAccountScopedReset } from "./accountScope";

let plansCache = null;

export const getPlansCache = () => plansCache;
export const setPlansCache = (data) => {
  plansCache = data;
};
export const clearPlansCache = () => {
  plansCache = null;
};

// Plans are per-creator: holding the previous account's plans here is what made the
// subscription page keep showing the old account's pricing after a switch.
registerAccountScopedReset(clearPlansCache);
