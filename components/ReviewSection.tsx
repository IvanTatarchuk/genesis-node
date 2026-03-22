"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { display_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  agentSlug: string;
  agentId: string;
  reviews: Review[];
  avgRating: number | null;
  reviewCount: number;
  userReview: Review | null;
  isLoggedIn: boolean;
}

function Stars({ rating, interactive = false, onSelect }: {
  rating: number;
  interactive?: boolean;
  onSelect?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onSelect?.(star)}
          className={`text-lg leading-none transition ${
            interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
          } ${star <= (hovered || rating) ? "text-yellow-400" : "text-slate-700"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReviewSection({
  agentSlug, agentId, reviews, avgRating, reviewCount, userReview, isLoggedIn,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(userReview?.rating ?? 0);
  const [comment, setComment] = useState(userReview?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    if (rating === 0) { setError("Please choose a rating so others can see your feedback."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, rating, comment }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "We couldn't save your review. Please try again.");
      }
      setShowForm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-200">Reviews</h2>
          {avgRating && (
            <div className="flex items-center gap-1.5">
              <Stars rating={Math.round(avgRating)} />
              <span className="text-sm font-medium text-slate-200">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-slate-500">({reviewCount})</span>
            </div>
          )}
        </div>
        {isLoggedIn && !userReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            + Write a review
          </button>
        )}
      </div>

      {/* Rating distribution */}
      {reviewCount > 0 && (
        <div className="grid grid-cols-5 gap-1 text-center rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => r.rating === star).length;
            const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
            const h = Math.max(4, Math.min(100, Math.round(pct)));
            const step = h <= 4 ? 4 : Math.round(h / 5) * 5;
            return (
              <div key={star} className="space-y-1">
                <div className="flex h-16 items-end justify-center">
                  <div
                    className={`w-5 rounded-t bg-indigo-500/60 transition-all review-bar-${step}`}
                  />
                </div>
                <p className="text-[10px] text-slate-500">★{star}</p>
                <p className="text-[10px] text-slate-400">{count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Write review form */}
      {showForm && (
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/80 p-5 space-y-4">
          <p className="text-sm font-medium text-slate-200">Your review</p>
          <div>
            <p className="text-xs text-slate-500 mb-2">Rating</p>
            <Stars rating={rating} interactive onSelect={setRating} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Comment (optional)</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Describe your experience with this agent..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit review"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* User's existing review */}
      {userReview && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Stars rating={userReview.rating} />
            <span className="text-xs text-emerald-400 font-medium">Your review</span>
          </div>
          {userReview.comment && (
            <p className="text-sm text-slate-300">{userReview.comment}</p>
          )}
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center">
          <p className="text-sm text-slate-500">No reviews yet.</p>
          {isLoggedIn && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              Be the first to review →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.filter(r => r.id !== userReview?.id).map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300 ring-1 ring-slate-700">
                  {review.reviewer?.display_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-300">
                    {review.reviewer?.display_name ?? "Anonymous"}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.comment && (
                <p className="text-sm text-slate-400 pl-10">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
