import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import "../styles/Comments.css";

type Props = {
  open: boolean;
  onClose: () => void;
  routeId: string;
  placement?: "modal" | "panel";
};

type CommentReply = {
  id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  avatar_url?: string | null;
};

type CommentThread = CommentReply & {
  replies: CommentReply[];
};

const API = import.meta.env.VITE_API_URL || window.location.origin;

const CommentsModal: React.FC<Props> = ({
  open,
  onClose,
  routeId,
  placement = "modal",
}) => {
  const { token } = useAuth();
  const { showAlert } = useAlert();

  const [comments, setComments] = useState<CommentThread[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const isPanel = placement === "panel";

  useEffect(() => {
    if (!open) {
      setReplyingTo(null);
      setReplyText("");
      return;
    }

    let cancelled = false;
    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/routes/${routeId}/comments`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          const detail = (await res.json().catch(() => null)) as {
            detail?: string;
          } | null;
          throw new Error(detail?.detail || "No se pudieron cargar los comentarios");
        }

        const data = (await res.json()) as CommentThread[];
        if (!cancelled) setComments(data);
      } catch (err) {
        if (cancelled) return;
        showAlert(err instanceof Error ? err.message : "Error desconocido");
        setComments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchComments();

    return () => {
      cancelled = true;
    };
  }, [open, routeId, token, showAlert]);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (!token) {
      showAlert("Debes iniciar sesión para comentar");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/routes/${routeId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: replyText.trim(),
          parent_id: replyingTo,
        }),
      });

      if (!res.ok) {
        const detail = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(detail?.detail || "No se pudo enviar el comentario");
      }

      const created = (await res.json()) as CommentReply;

      setComments((prev) => {
        if (replyingTo) {
          return prev.map((c) =>
            c.id === replyingTo
              ? { ...c, replies: [...(c.replies || []), created] }
              : c
          );
        }
        return [{ ...created, replies: [] }, ...prev];
      });

      setReplyText("");
      setReplyingTo(null);
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    if (!iso || Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  };

  const renderAvatar = (username?: string | null, avatarUrl?: string | null) => {
    if (avatarUrl) {
      return <img className="comment-avatar comment-avatar--image" src={avatarUrl} alt={username || "avatar"} />;
    }
    const letters = (username || "??").slice(0, 2).toUpperCase();
    return <div className="comment-avatar">{letters}</div>;
  };

  const content = (
    <div
      className={`comments-modal-content ${
        isPanel ? "comments-modal-content--panel" : ""
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="comments-modal-header">
        <div>
          <h2>Comentarios</h2>
          {replyingTo ? (
            <p className="comment-replying-to">
              Respondiendo a un comentario ·{" "}
              <button type="button" onClick={() => setReplyingTo(null)}>
                Cancelar
              </button>
            </p>
          ) : null}
        </div>
        <button className="comments-modal-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="comments-list">
        {loading ? (
          <p>Cargando comentarios...</p>
        ) : comments.length === 0 ? (
          <p>No hay comentarios todavía.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-card">
              {renderAvatar(comment.username, comment.avatar_url)}
              <div className="comment-info">
                <div className="comment-header">
                  <span className="comment-author">{comment.username}</span>
                  <span className="comment-time">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="comment-text">{comment.content}</p>
                <div className="comment-actions">
                  <button
                    className="comment-reply-btn"
                    type="button"
                    onClick={() => setReplyingTo(comment.id)}
                  >
                    Responder
                  </button>
                </div>

                {comment.replies?.length ? (
                  <div className="comment-replies">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="comment-card comment-card--reply">
                        {renderAvatar(reply.username, reply.avatar_url)}
                        <div className="comment-info">
                          <div className="comment-header">
                            <span className="comment-author">{reply.username}</span>
                            <span className="comment-time">
                              {formatDate(reply.created_at)}
                            </span>
                          </div>
                          <p className="comment-text">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="comments-input-section">
        <form className="comment-form" onSubmit={handleSubmitReply}>
          <textarea
            className="comment-input"
            placeholder={
              replyingTo ? "Responde al comentario..." : "Escribe un comentario..."
            }
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={submitting}
          />
          <div className="comment-actions-bar">
            <div />
            <button
              type="submit"
              className="comment-submit-btn"
              disabled={!replyText.trim() || submitting}
            >
              {submitting ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!open) return null;

  if (isPanel) {
    return <div className="comments-panel">{content}</div>;
  }

  return (
    <div className="comments-modal-overlay" onClick={onClose}>
      {content}
    </div>
  );
};

export default CommentsModal;
