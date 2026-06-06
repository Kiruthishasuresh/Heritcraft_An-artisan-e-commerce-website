import React, { useState } from "react";
import { FiX, FiCheck, FiTrash2, FiRefreshCw, FiLoader, FiAlertTriangle } from "react-icons/fi";
import StarRating from "../StarRating";
import { reviewAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../common/ConfirmModal";

const AdminReviewModerationModal = ({ review, onClose, onUpdate }) => {
  const [status, setStatus] = useState(review.status || "VISIBLE");
  const [adminNote, setAdminNote] = useState(review.adminNote || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const toast = useToast();

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await reviewAPI.updateReviewStatus(review.id, {
        status,
        adminNote: adminNote.trim(),
      });
      toast.success("Review status updated successfully!");
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const performDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await reviewAPI.deleteReview(review.id);
      toast.success("Review soft-deleted successfully.");
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to delete review");
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setError("");
    try {
      await reviewAPI.restoreReview(review.id);
      toast.success("Review restored to VISIBLE status.");
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to restore review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" style={{ zIndex: 9999 }}>
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-[var(--gold)] rounded-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]" style={{ zIndex: 10000 }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <FiX size={24} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Review Moderation</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Metadata columns */}
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Review Information</h4>
              <p className="text-xs text-zinc-300 mt-1"><span className="text-zinc-500">ID:</span> {review.id}</p>
              <p className="text-xs text-zinc-300"><span className="text-zinc-500">Created:</span> {formatDate(review.createdAt)}</p>
              <p className="text-xs text-zinc-300"><span className="text-zinc-500">Updated:</span> {formatDate(review.updatedAt)}</p>
              <p className="text-xs text-zinc-300"><span className="text-zinc-500">Order ID:</span> {review.orderId}</p>
            </div>

            <div>
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Product & Seller</h4>
              <p className="text-xs text-white font-medium mt-1">{review.productName}</p>
              <p className="text-xs text-zinc-400">{review.sellerShopName} (Seller: {review.sellerName})</p>
              <p className="text-xs text-zinc-500">Seller ID: {review.sellerId}</p>
            </div>

            <div>
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Buyer Details</h4>
              <p className="text-xs text-white font-medium mt-1">{review.userName}</p>
              <p className="text-xs text-zinc-400">{review.buyerEmail}</p>
              <p className="text-xs text-zinc-500">Buyer ID: {review.userId}</p>
            </div>
          </div>

          <div className="space-y-4 bg-zinc-900/40 p-4 border border-zinc-900 rounded-lg">
            <div>
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-2">Review Content</h4>
              <div className="flex items-center gap-1.5 mb-2">
                <StarRating rating={review.rating} readonly size={14} />
                <span className="text-xs text-[var(--gold)] font-bold">({review.rating} / 5)</span>
              </div>
              <p className="text-zinc-300 text-xs italic bg-zinc-900 p-3 rounded border border-zinc-800 leading-relaxed">
                "{review.comment}"
              </p>
            </div>

            {review.images && review.images.length > 0 && (
              <div>
                <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1.5">Attachments</h4>
                <div className="flex flex-wrap gap-1.5">
                  {review.images.map((img, idx) => (
                    <img key={idx} src={img} alt="review" className="w-12 h-12 object-cover rounded border border-zinc-800" />
                  ))}
                </div>
              </div>
            )}

            {review.sellerReply && (
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[var(--gold)] tracking-wider">Seller Response</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed italic mt-1">
                  "{review.sellerReply}"
                </p>
                <span className="text-[9px] text-zinc-600 block mt-1">Replied on: {formatDate(review.sellerReplyAt)}</span>
              </div>
            )}

            {review.status === "REPORTED" && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded text-xs text-red-400">
                <div className="font-semibold flex items-center gap-1 mb-1">
                  <FiAlertTriangle size={12} /> Reported by Seller:
                </div>
                <p className="italic">"{review.reportedReason}"</p>
                <span className="text-[9px] text-zinc-500 block mt-1">Reported on: {formatDate(review.reportedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Form */}
        <form onSubmit={handleStatusUpdate} className="space-y-4 pt-4 border-t border-zinc-850">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 text-xs font-semibold mb-1">
                Moderation Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--gold)] transition-colors cursor-pointer"
                disabled={loading || review.status === "DELETED"}
              >
                <option value="VISIBLE">Visible</option>
                <option value="HIDDEN">Hidden</option>
                <option value="REPORTED">Reported</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 text-xs font-semibold mb-1">
                Admin Note
              </label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Internal annotation (e.g. Approved review, spam account...)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gold)] transition-colors"
                disabled={loading || review.status === "DELETED"}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="flex items-center gap-2">
              {review.status === "DELETED" ? (
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-900 hover:bg-green-800 text-white rounded text-xs font-bold transition-all"
                >
                  <FiRefreshCw size={14} /> Restore Review
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-950/60 hover:bg-red-900 hover:text-white border border-red-900 text-red-400 rounded text-xs font-bold transition-all"
                >
                  <FiTrash2 size={14} /> Soft Delete
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-zinc-850 hover:border-zinc-750 hover:bg-zinc-900 text-zinc-300 rounded text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || review.status === "DELETED"}
                className="flex items-center gap-1 px-5 py-2 bg-[var(--gold)] text-black font-bold rounded text-xs hover:bg-yellow-500 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? <FiLoader className="animate-spin" size={12} /> : <FiCheck size={12} />} Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Soft Delete Review"
        message="Are you sure you want to soft-delete this review? It can be restored later."
        confirmText="Soft Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={performDelete}
        onCancel={() => setShowConfirmDelete(false)}
        loading={loading}
      />
    </div>
  );
};

export default AdminReviewModerationModal;
