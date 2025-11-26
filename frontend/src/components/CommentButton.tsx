import React from 'react';
import '../styles/Comments.css';

type Props = {
  onClick?: () => void;
};

const CommentButton: React.FC<Props> = ({ onClick }) => {
  return (
    <div className="comment-button-wrapper">
      <ul>
        <li 
          style={{ '--i': '#56CCF2', '--j': '#2F80ED' } as React.CSSProperties}
          onClick={onClick}
          title="Ver comentarios"
        >
          <span className="comment-icon">💬</span>
          <span className="comment-title">Comments</span>
        </li>
      </ul>
    </div>
  );
}

export default CommentButton;
