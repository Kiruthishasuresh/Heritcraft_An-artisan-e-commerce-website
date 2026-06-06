import React, { useState } from "react";
import { FiMessageSquare, FiAlertTriangle, FiCheck, FiX, FiLoader } from "react-icons/fi";
import StarRating from "../StarRating";
import { reviewAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const SellerReviewCard = ({ review, onUpdate }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState(review.sellerReply || "");
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setLoading(true);
    setError("");

    try {
      await reviewAPI.replyAsSeller(review.id, {
        sellerId: review.sellerId,
        reply: replyText.trim(),
      });
      toast.success("Reply submitted successfully!");
      setShowReplyForm(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to submit reply");
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    setLoading(true);
    setError("");

    try {
      await reviewAPI.reportReview(review.id, {
        sellerId: review.sellerId,
        reason: reportReason.trim(),
      });
      toast.success("Review reported to admin.");
      setShowReportForm(false);
      setReportReason("");
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to report review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4 hover:border-zinc-700 transition-all">
      {/* Product & Buyer Details */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          {review.productImage ? (
            <img
              src={review.productImage}
              alt={review.productName}
              className="w-12 h-12 object-cover rounded-md border border-zinc-800"
            />
          ) : (
            <div className="w-12 h-12 bg-zinc-800 rounded-md border border-zinc-750" />
          )}
          <div>
            <h4 className="font-semibold text-white text-sm hover:text-[var(--gold)] transition-colors cursor-pointer">
              {review.productName}
            </h4>
            <p className="text-xs text-zinc-500">Order ID: {review.orderId}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end gap-1">
          <StarRating rating={review.rating} readonly size={16} />
          <span className="text-xs text-zinc-400">
            By <span className="text-white font-medium">{review.userName}</span> on {formatDate(review.createdAt)}
          </span>
        </div>
      </div>

      {/* Review Comment */}
      <div className="pl-1 mb-4">
        <p className="text-zinc-300 text-sm leading-relaxed mb-3">"{review.comment}"</p>
        
        {review.images && review.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {review.images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt="review attachment"
                className="w-14 h-14 object-cover rounded border border-zinc-800"
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-950/40 border border-red-900 rounded text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Reply Section */}
      {review.sellerReply ? (
        <div className="pl-4 border-l-2 border-[var(--gold)] bg-zinc-950/60 p-4 rounded-r-lg mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-[var(--gold)] tracking-wide">
              Your Response
            </span>
            <span className="text-[10px] text-zinc-500">
              {formatDate(review.sellerReplyAt)}
            </span>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed italic">"{review.sellerReply}"</p>
          
          {!showReplyForm && (
            <button
              onClick={() => {
                setReplyText(review.sellerReply);
                setShowReplyForm(true);
              }}
              className="text-[10px] text-zinc-500 hover:text-[var(--gold)] transition-colors mt-2 underline"
            >
              Edit Reply
            </button>
          )}
        </div>
      ) : (
        !showReplyForm && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReplyForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-850 hover:bg-zinc-800 text-xs text-white border border-zinc-750 hover:border-[var(--gold-muted)] transition-all"
            >
              <FiMessageSquare size={14} className="text-[var(--gold)]" /> Reply
            </button>
            {review.status !== "REPORTED" && (
              <button
                onClick={() => setShowReportForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-950 hover:bg-zinc-900 text-xs text-zinc-400 hover:text-red-400 border border-zinc-900 hover:border-red-900/50 transition-all"
              >
                <FiAlertTriangle size={14} /> Report
              </button>
            )}
          </div>
        )
      )}

      {/* Reply Form */}
      {showReplyForm && (
        <form onSubmit={handleReplySubmit} className="mt-4 bg-zinc-950/40 p-4 border border-zinc-850 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-zinc-300">
              {review.sellerReply ? "Edit your response" : "Write a response"}
            </label>
            <button
              type="button"
              onClick={() => {
                setShowReplyForm(false);
                setReplyText(review.sellerReply || "");
              }}
              className="text-zinc-500 hover:text-white"
            >
              <FiX size={16} />
            </button>
          </div>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply to this review..."
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--gold)] transition-colors mb-3"
            disabled={loading}
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowReplyForm(false);
                setReplyText(review.sellerReply || "");
              }}
              className="px-3 py-1 border border-zinc-800 text-zinc-400 hover:text-white rounded text-xs transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !replyText.trim()}
              className="flex items-center gap-1 px-3 py-1 bg-[var(--gold)] text-black font-semibold rounded text-xs hover:bg-yellow-500 transition-all"
            >
              {loading ? <FiLoader className="animate-spin" size={12} /> : <FiCheck size={12} />} Save Reply
            </button>
          </div>
        </form>
      )}

      {/* Report Form */}
      {showReportForm && (
        <form onSubmit={handleReportSubmit} className="mt-4 bg-red-950/10 p-4 border border-red-900/20 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-red-400 flex items-center gap-1">
              <FiAlertTriangle size={12} /> Report Review to Admin
            </label>
            <button
              type="button"
              onClick={() => {
                setShowReportForm(false);
                setReportReason("");
              }}
              className="text-zinc-500 hover:text-white"
            >
              <FiX size={16} />
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 mb-2 leading-relaxed">
            Please specify the reason why you believe this review is inappropriate, spam, or violates terms.
          </p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="e.g. Inappropriate language, spam rating, false accusations..."
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-red-900 transition-colors mb-3"
            disabled={loading}
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowReportForm(false);
                setReportReason("");
              }}
              className="px-3 py-1 border border-zinc-800 text-zinc-400 hover:text-white rounded text-xs transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reportReason.trim()}
              className="flex items-center gap-1 px-3 py-1 bg-red-900 hover:bg-red-800 text-white font-semibold rounded text-xs transition-all"
            >
              {loading ? <FiLoader className="animate-spin" size={12} /> : <FiCheck size={12} />} Submit Report
            </button>
          </div>
        </form>
      )}

      {/* Status indicator if flagged */}
      {review.status !== "VISIBLE" && review.status !== "APPROVED" && (
        <div className="mt-3 flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase px-2 py-1 rounded bg-zinc-950 w-fit text-zinc-500">
          Status: <span className={`${review.status === "REPORTED" ? "text-amber-500" : review.status === "HIDDEN" ? "text-red-500" : "text-gray-400"}`}>{review.status}</span>
        </div>
      )}
    </div>
  );
};

export default SellerReviewCard;
