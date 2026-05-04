import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getEmptyuserMetadata } from "@/Helpers/Encryptions";

/**
 * useUserProfile - Hook to retrieve a user's profile from the Redux cache.
 * @param {string} pubkey - The public key of the user.
 */
const useUserProfile = (pubkey) => {
  const nostrAuthors = useSelector((state) => state.nostrAuthors);
  const [userProfile, setUserProfile] = useState({
    ...getEmptyuserMetadata(pubkey),
    empty: true,
  });

  useEffect(() => {
    if (pubkey) {
      const user = nostrAuthors.find((author) => author.pubkey === pubkey);
      if (user) {
        setUserProfile({ ...user, empty: false });
      } else {
        setUserProfile({ ...getEmptyuserMetadata(pubkey), empty: true });
      }
    } else {
      setUserProfile({ ...getEmptyuserMetadata(pubkey), empty: true });
    }
  }, [nostrAuthors, pubkey]);

  return { userProfile };
};

export default useUserProfile;
