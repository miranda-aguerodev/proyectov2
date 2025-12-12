// src/navigation/pages/ReviewDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";

import likeIcon from "../../assets/images/review-section/like.svg";
import dislikeIcon from "../../assets/images/review-section/dislike.svg";
import commentIcon from "../../assets/images/review-section/comment.svg";

import "./Review.css";

const fallbackImage =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80";

// Helpers
const extractStoragePath = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) {
    const marker = "/storage/v1/object/public/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }
  return url;
};

const getSignedUrlIfNeeded = async (url) => {
  if (!url) return "";
  const path = extractStoragePath(url);
  if (!path) return url;
  const [bucket, ...rest] = path.split("/");
  const objectPath = rest.join("/");
  try {
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 3600);
    return data?.signedUrl || url;
  } catch {
    return url;
  }
};

const enrichCommentAvatar = async (comment) => {
  if (!comment?.profiles?.avatar_url) return comment;
  const signed = await getSignedUrlIfNeeded(comment.profiles.avatar_url);
  return {
    ...comment,
    profiles: { ...comment.profiles, avatar_url: signed },
  };
};

/**
 * Props:
 * - reviewId   : id de la reseña a mostrar (number/string)
 * - onClose    : función para cerrar el modal
 */
function ReviewDetail({ reviewId, onClose }) {
  const { user, profile } = useAuth();
  const userId = user?.id;

  const [review, setReview] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(fallbackImage);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [voting, setVoting] = useState(false);

  
  
    useEffect(() => {
    document.body.classList.add("modal-open");
    return () => {
        document.body.classList.remove("modal-open");
    };
    }, []);

  // Cargar reseña completa
  useEffect(() => {
    if (!reviewId) return;

    const fetchReview = async () => {
      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("reviews")
          .select(
            `
            id, user_id, rating, content, created_at,
            profiles:profiles!reviews_user_id_fkey (id, username, full_name, avatar_url),
            places:places!reviews_place_id_fkey (id, name, address, latitude, longitude),
            review_images (image_url),
            review_hashtags (hashtags (tag)),
            votes (id, type, user_id),
            review_comments (
              id,
              user_id,
              content,
              created_at,
              profiles:profiles!review_comments_user_id_fkey (id, username, full_name, avatar_url)
            )
          `
          )
          .eq("id", reviewId)
          .single();

        if (error) throw error;
        if (!data) {
          setError("No se encontró la reseña.");
          setLoading(false);
          return;
        }

        const rawPhoto = data.review_images?.[0]?.image_url;
        const rawAvatar = data.profiles?.avatar_url;

        const [signedPhoto, signedAvatar] = await Promise.all([
          rawPhoto ? getSignedUrlIfNeeded(rawPhoto) : Promise.resolve(null),
          rawAvatar ? getSignedUrlIfNeeded(rawAvatar) : Promise.resolve(null),
        ]);

        setPhotoUrl(signedPhoto || rawPhoto || fallbackImage);
        setAvatarUrl(signedAvatar || rawAvatar || "");

        const enrichedComments = await Promise.all(
          (data.review_comments || []).map((c) => enrichCommentAvatar(c))
        );

        setReview({
          ...data,
          review_comments: enrichedComments,
        });
      } catch (err) {
        setError(err?.message ?? "No se pudo cargar la reseña.");
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [reviewId]);

  const author = review?.profiles || {};
  const place = review?.places || {};
  const tags =
    review?.review_hashtags?.map((rh) => rh.hashtags?.tag).filter(Boolean) || [];
  const votes = review?.votes || [];
  const comments = review?.review_comments || [];

  const likeCount = votes.filter((v) => v.type === "like").length;
  const dislikeCount = votes.filter((v) => v.type === "dislike").length;

  const authorInitial = useMemo(() => {
    const seed = (author.full_name || author.username || "U").replace(/^@+/, "");
    return seed.charAt(0).toUpperCase();
  }, [author.full_name, author.username]);

  const createdDate = review
    ? new Date(review.created_at).toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const canInteract = Boolean(userId);
  const currentUsername = profile?.username || "";

  const handleVote = async (type) => {
    if (!userId || !review) {
      setError("Debes iniciar sesión para reaccionar.");
      return;
    }

    setVoting(true);
    setError("");

    try {
      const existing = review.votes?.find((v) => v.user_id === userId);

      if (existing && existing.type === type) {
        await supabase.from("votes").delete().eq("id", existing.id);
        setReview((prev) => ({
          ...prev,
          votes: (prev.votes || []).filter((v) => v.id !== existing.id),
        }));
        return;
      }

      if (existing) {
        const { data, error } = await supabase
          .from("votes")
          .update({ type })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        setReview((prev) => ({
          ...prev,
          votes: (prev.votes || []).map((v) =>
            v.id === existing.id ? data : v
          ),
        }));
      } else {
        const { data, error } = await supabase
          .from("votes")
          .insert({ review_id: review.id, user_id: userId, type })
          .select()
          .single();
        if (error) throw error;
        setReview((prev) => ({
          ...prev,
          votes: [...(prev.votes || []), data],
        }));
      }
    } catch (err) {
      setError(err?.message ?? "No se pudo registrar tu reacción.");
    } finally {
      setVoting(false);
    }
  };

  const handleComment = async () => {
    if (!userId || !review) {
      setError("Debes iniciar sesión para comentar.");
      return;
    }
    const trimmed = commentDraft.trim();
    if (!trimmed) return;

    setSendingComment(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("review_comments")
        .insert({
          review_id: review.id,
          user_id: userId,
          content: trimmed,
        })
        .select(
          `
          id, user_id, content, created_at,
          profiles:profiles!review_comments_user_id_fkey (id, username, full_name, avatar_url)
        `
        )
        .single();
      if (error) throw error;

      const enriched = await enrichCommentAvatar(data);

      setReview((prev) => ({
        ...prev,
        review_comments: [enriched, ...(prev.review_comments || [])],
      }));
      setCommentDraft("");
    } catch (err) {
      setError(err?.message ?? "No se pudo publicar el comentario.");
    } finally {
      setSendingComment(false);
    }
  };

  if (!reviewId) return null;

  return (
    <div className="review-detail-overlay" onClick={onClose}>
      <div
        className="review-detail-modal"
        onClick={(e) => e.stopPropagation()} // para que no cierre si haces click dentro
      >
        <button
          type="button"
          className="review-detail-close"
          onClick={onClose}
        >
          ×
        </button>

        {/* Imagen principal */}
        <div className="review-detail-image-wrapper">
          <img src={photoUrl} alt={place.name || "Lugar"} />
        </div>

        {/* Contenido scrolleable */}
        <div className="review-detail-scroll">
          {loading && <p className="muted">Cargando reseña...</p>}
          {error && <p className="muted error">{error}</p>}

          {!loading && review && (
            <>
              {/* Header */}
              <header className="detail-header">
                <div className="detail-header-left">
                  <h1>{place.name || "Lugar sin nombre"}</h1>
                  {place.address && (
                    <p className="detail-address">{place.address}</p>
                  )}
                  <div className="detail-author-inline">
                    <div className="detail-author-avatar">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={author.username || "avatar"} />
                      ) : (
                        <span>{authorInitial}</span>
                      )}
                    </div>
                    <div>
                      <p className="author-name">
                        {author.full_name || author.username || "Usuario"}
                      </p>
                      <p className="author-handle">
                        {author.username || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="detail-rating">
                  <span className="detail-rating-number">
                    {review.rating.toFixed(1)}
                  </span>
                  <div
                    className="detail-stars"
                    aria-label={`${review.rating} estrellas`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={n <= review.rating ? "star filled" : "star"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="detail-date">{createdDate}</span>
                </div>
              </header>

              {/* Reseña */}
              <section className="detail-content">
                <h2>Reseña</h2>
                <p>{review.content || "Sin descripción."}</p>
              </section>

              {/* Hashtags */}
              {tags.length > 0 && (
                <section className="detail-tags">
                  <h3>Hashtags</h3>
                  <div className="tags">
                    {tags.map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* Acciones */}
              <section className="detail-actions">
                <button
                  type="button"
                  className="pill like"
                  onClick={() => handleVote("like")}
                  disabled={!canInteract || voting}
                >
                  <img src={likeIcon} alt="" />
                  <span>{likeCount}</span>
                </button>
                <button
                  type="button"
                  className="pill dislike"
                  onClick={() => handleVote("dislike")}
                  disabled={!canInteract || voting}
                >
                  <img src={dislikeIcon} alt="" />
                  <span>{dislikeCount}</span>
                </button>
                <div className="detail-comments-count">
                  <img src={commentIcon} alt="" />
                  <span>{comments.length}</span>
                </div>
              </section>

              {/* Comentarios */}
              <section className="detail-comments">
                <h3>Comentarios</h3>

                <div className="detail-comments-list">
                  {comments.length === 0 && (
                    <p className="muted small">
                      Sé el primero en comentar.
                    </p>
                  )}

                  {comments.map((c) => (
                    <div key={c.id} className="comment-row">
                      <div className="comment-avatar">
                        {c.profiles?.avatar_url ? (
                          <img
                            src={c.profiles.avatar_url}
                            alt={c.profiles.username || "avatar"}
                          />
                        ) : (
                          <span className="comment-initial">
                            {(c.profiles?.username || "U")
                              .replace(/^@+/, "")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="comment-body">
                        <div className="comment-meta">
                          <span className="comment-user">
                            {c.profiles?.full_name ||
                              c.profiles?.username ||
                              "Usuario"}
                          </span>
                          {c.profiles?.username && (
                            <span className="comment-handle">
                              {c.profiles.username}
                            </span>
                          )}
                          <span className="comment-date">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="comment-text">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Input de comentario fijo al fondo del modal */}
        <div className="detail-comment-input-row">
          <div className="comment-avatar small">
            {canInteract && profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={currentUsername || "avatar"} />
            ) : (
              <span className="comment-initial">
                {(currentUsername || "U")
                  .replace(/^@+/, "")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder={
              canInteract
                ? "Escribe un comentario..."
                : "Inicia sesión para comentar"
            }
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleComment();
              }
            }}
            disabled={!canInteract || sendingComment}
          />
          <button
            type="button"
            className="primary small"
            onClick={handleComment}
            disabled={!canInteract || sendingComment || !commentDraft.trim()}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewDetail;
