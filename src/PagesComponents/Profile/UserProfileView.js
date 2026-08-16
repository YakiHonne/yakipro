import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { ndkInstance } from "@/Helpers/NDKInstance";
import {
  getEmptyuserMetadata,
  getParsedAuthor,
} from "@/Helpers/Encryptions";
import Spinner from "@/Components/Spinner";
import Icon from "@/Components/LucideIcon";

export default function UserProfileView({ pubkey, username }) {
  const [profile, setProfile] = useState(() => getEmptyuserMetadata(pubkey));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProfile(getEmptyuserMetadata(pubkey));

    ndkInstance
      .fetchEvent({ kinds: [0], authors: [pubkey] })
      .then((event) => {
        if (cancelled || !event) return;
        const raw = event.rawEvent ? event.rawEvent() : event;
        setProfile(getParsedAuthor(raw));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pubkey]);

  const name = profile?.display_name || profile?.name || username;

  return (
    <div
      className="fit-container fx-centered fx-col box-pad-h box-pad-v"
      style={{ rowGap: "18px", maxWidth: 620, margin: "0 auto" }}
    >
      {profile?.banner && (
        <div
          className="fit-container round-corner bg-img bg-cover"
          style={{ height: 160, backgroundImage: `url(${profile.banner})` }}
        />
      )}

      <div className="fx-centered fx-col" style={{ rowGap: "10px" }}>
        <div
          className="round-corner-xl bg-img bg-cover"
          style={{
            width: 92,
            height: 92,
            backgroundImage: profile?.picture ? `url(${profile.picture})` : undefined,
            backgroundColor: "var(--color-subtle-fill)",
          }}
        />
        <h3 style={{ margin: 0 }}>{name}</h3>
        <p className="p-secondary-c p-medium" style={{ margin: 0 }}>
          yakihonne.com/{username}
        </p>
        {profile?.nip05 && (
          <p
            className="p-medium fx-centered"
            style={{ margin: 0, gap: "5px", color: "var(--color-green-main)" }}
          >
            <Icon name="check" size={13} /> {profile.nip05}
          </p>
        )}
      </div>

      {loading && <Spinner size={18} />}

      {profile?.about && (
        <p
          className="p-secondary-c"
          style={{ margin: 0, textAlign: "center", lineHeight: 1.6 }}
        >
          {profile.about}
        </p>
      )}
    </div>
  );
}
