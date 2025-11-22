import React, { useState } from "react";
import "../styles/Comments.css";

type Props = {
  open: boolean;
  onClose: () => void;
  routeId: string;
};

const EXAMPLE_COMMENTS = [
  {
    id: '1',
    author: 'Juan García',
    avatar: 'JG',
    timestamp: 'Hace 2 horas',
    content: 'Excelente ruta! Las vistas son increíbles.',
  },
  {
    id: '2',
    author: 'María López',
    avatar: 'ML',
    timestamp: 'Hace 1 hora',
    content: 'Muy bien marcada y fácil de seguir. Recomendado!',
  },
  {
    id: '3',
    author: 'Carlos Ruiz',
    avatar: 'CR',
    timestamp: 'Hace 45 minutos',
    content: 'La subida fue bastante dura pero vale la pena. Llevar agua!',
  },
  {
    id: '4',
    author: 'Laura Fernández',
    avatar: 'LF',
    timestamp: 'Hace 30 minutos',
    content: 'Perfecto para un domingo. La familia lo disfrutó mucho.',
  },
  {
    id: '5',
    author: 'David Martínez',
    avatar: 'DM',
    timestamp: 'Hace 20 minutos',
    content: 'He visto muchos pájaros en el bosque, muy bonito!',
  },
  {
    id: '6',
    author: 'Ana Sánchez',
    avatar: 'AS',
    timestamp: 'Hace 15 minutos',
    content: 'Cuidado en el km 5, hay un tramo resbaladizo cuando llueve.',
  },
  {
    id: '7',
    author: 'Roberto López',
    avatar: 'RL',
    timestamp: 'Hace 10 minutos',
    content: 'Acabo de hacerla, está en perfectas condiciones.',
  },
  {
    id: '8',
    author: 'Sophie Bernard',
    avatar: 'SB',
    timestamp: 'Hace 5 minutos',
    content: 'Una joya escondida! No la conocía, gracias por compartirla.',
  },
  {
    id: '9',
    author: 'Miguel Ángel',
    avatar: 'MA',
    timestamp: 'Hace 2 minutos',
    content: 'Primer intento y me encantó. Volveré el próximo fin de semana.',
  },
  {
    id: '10',
    author: 'Isabel Gómez',
    avatar: 'IG',
    timestamp: 'Hace 1 minuto',
    content: 'Excelente vista desde la cima. El atardecer fue espectacular.',
  },
];

const API = import.meta.env.VITE_API_URL || window.location.origin;

const CommentsModal: React.FC<Props> = ({ open, onClose, routeId }) => {
  const [comments, setComments] = useState(EXAMPLE_COMMENTS);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text) return;
    if (!token) {
      showAlert("Debes iniciar sesión para comentar");
      return;
    }

    // TODO: Enviar comentario al backend
    console.log('Nuevo comentario:', replyText, 'Para ruta:', routeId);

    // Añadir al estado local sin recargar
    const newComment = {
      id: String(Date.now()),
      author: "Tú",
      avatar: "",
      timestamp: new Date().toLocaleString(),
      content: text,
    };
    setComments((prev) => [newComment, ...prev]);
    setReplyText('');
  };

  // TODO: Implementar like de comentarios
  // const handleLikeComment = (commentId: string) => {
  //   console.log('Like en comentario:', commentId);
  // };

  if (!open) return null;

  return (
    <>
      <div className="comments-modal-overlay" onClick={onClose}>
        <div className="comments-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="comments-modal-header">
            <h2>Comentarios</h2>
            <button className="comments-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>

          {/* Comments List */}
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment-card">
                <div className="comment-avatar">{comment.avatar}</div>
                <div className="comment-info">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-time">{comment.timestamp}</span>
                  </div>
                  <p className="comment-text">{comment.content}</p>
                  <div className="comment-actions">
                    {/* TODO: Descomentar cuando implementemos likes */}
                    {/* <button className="comment-like-btn" onClick={() => handleLikeComment(comment.id)}>
                      ❤️ {comment.likes}
                    </button> */}
                    
                    <button className="comment-reply-btn">Responder</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Section */}
          <div className="comments-input-section">
            <form className="comment-form" onSubmit={handleSubmitReply}>
              <textarea
                className="comment-input"
                placeholder="Escribe un comentario..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                aria-label="Escribe un comentario"
              />
              {error ? <p className="comment-error">{error}</p> : null}
              <div className="comment-actions-bar">
                <button
                  type="submit"
                  className="comment-submit-btn"
                  disabled={!replyText.trim()}
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommentsModal;
