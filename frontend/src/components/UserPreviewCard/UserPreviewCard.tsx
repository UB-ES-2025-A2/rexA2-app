import React from "react";
import "../../styles/UserPreviewCard.css";

type Props = {
  id: string;
  username: string;
  name?: string;
  email: string;
  avatar_url?: string | null;
  onClick?: () => void;
};

const UserPreviewCard: React.FC<Props> = ({
  username,
  name,
  email,
  avatar_url,
  onClick
}) => {
  const initial = (name || username || "?")[0]?.toUpperCase();

  return (
    <div className="user-card" onClick={onClick}>
      
      {/* Avatar */}
      <div className="user-card-avatar">
        {avatar_url ? (
          <img src={avatar_url} alt={`Avatar de ${username}`} />
        ) : (
          <div className="avatar-placeholder">{initial}</div>
        )}
      </div>

      {/* Text */}
      <div className="user-card-info">
        <div className="user-card-name-row">
          <h3 className="user-card-username">{username}</h3>
        </div>

        <p className="user-card-name">{name || "—"}</p>

        {/* Email con shrink */}
        <p className="user-card-email">{email}</p>
      </div>

    </div>
  );
};

export default UserPreviewCard;
