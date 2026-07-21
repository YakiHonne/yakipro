import useUserProfile from "@/hooks/useUserProfile";
import Icon from "@/Components/LucideIcon";

export default function UserRow({ pubkey, remove = false, children }) {
  const { userProfile } = useUserProfile(pubkey);
  return (
    <div className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-s fx-scattered">
      <div className="fx-centered fx-start-h fx-gap-h">
        <div
          className="bg-cover"
          style={{
            backgroundImage: `url(${userProfile.picture || ""})`,
            backgroundColor: "var(--color-divider)",
            borderRadius: "50%",
            width: 38,
            height: 38,
          }}
        >
          {!userProfile.picture && (
            <div
              className="fx-centered"
              style={{ width: "100%", height: "100%" }}
            >
              <Icon name="user" size={20} />
            </div>
          )}
        </div>
        <div className="fx-col fx-start-v" style={{ gap: 0 }}>
          <p className="p-bold p-one-line">{userProfile.display_name}</p>
          <p className="gray-c p-medium p-one-line">@{userProfile.name}</p>
        </div>
      </div>
      {children}
      {remove && <Icon name={"trash"} size={24} onClick={remove} />}
    </div>
  );
}
