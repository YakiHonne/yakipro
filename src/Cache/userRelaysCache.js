let userRelaysCache = null;

export const getUserRelaysCache = () => userRelaysCache;
export const setUserRelaysCache = (relays) => {
  userRelaysCache = relays;
};
export const clearUserRelaysCache = () => {
  userRelaysCache = null;
};
