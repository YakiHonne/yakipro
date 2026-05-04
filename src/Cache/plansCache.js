let plansCache = null;

export const getPlansCache = () => plansCache;
export const setPlansCache = (data) => {
  plansCache = data;
};
export const clearPlansCache = () => {
  plansCache = null;
};
