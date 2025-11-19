import type React from "react";
import "../../styles/UserPreviewCard.css";

type Props = {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  onClick?: () => void;
};

const UserPreviewCard: React.FC<Props> = ({
  id,
  username,
  email,
  name,
  avatar_url,
  onClick,
}) => {
  return (
    <div className="user-preview-card" onClick={onClick}>
      <div className="user-avatar">
        {avatar_url ? (
          <img src={avatar_url} alt="avatar" />
        ) : (
          <div className="user-avatar-placeholder">{username[0].toUpperCase()}</div>
        )}
      </div>

      <div className="user-info">
        <h3 className="user-username">@{username}</h3>


        <p className="user-email">{email}</p>
      </div>
    </div>
  );
};

export default UserPreviewCard;
