import React, { useState } from "react";
import { FiX, FiLoader, FiCamera, FiPlus } from "react-icons/fi";
import StarRating from "../StarRating";
import { reviewAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const ReviewForm = ({ productId: propProductId, orderId: propOrderId, productName: propProductName, order, item, onClose, onSuccess }) => {
  const productId = propProductId || item?.productId || item?.product?.id || item?.product?._id;
  const orderId = propOrderId || order?.id || order?._id;
  const productName = propProductName || item?.productName || item?.name || item?.product?.name || "Product";
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const handleAddImage = (e) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    if (!newImageUrl.startsWith("http://") && !newImageUrl.startsWith("https://")) {
      setError("Please enter a valid image URL starting with http:// or https://");
      return;
    }
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
    setError("");
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars");
      return;
    }
    if (!comment.trim()) {
      setError("Please write a comment describing your experience");
      return;
    }

    setLoading(false);
    setError("");
    setLoading(true);

    try {
      const payload = {
        productId,
        orderId,
        rating,
        comment: comment.trim(),
        images,
      };
      await reviewAPI.create(payload);
      toast.success("Review submitted successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to submit review. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" style={{ zIndex: 9999 }}>
      <div className="relative w-full max-w-lg bg-zinc-950 border border-[var(--gold)] rounded-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]" style={{ zIndex: 10000 }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <FiX size={24} />
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-1">Write a Review</h2>
        <p className="text-zinc-400 text-sm mb-6 truncate">
          For product: <span className="text-[var(--gold)]">{productName}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Selection */}
          <div>
            <label className="block text-zinc-300 text-sm font-semibold mb-2">
              Overall Rating
            </label>
            <div className="flex items-center gap-2">
              <StarRating rating={rating} onRate={setRating} size={28} />
              <span className="text-sm font-medium text-[var(--gold)] ml-2">
                {rating === 5 && "Excellent"}
                {rating === 4 && "Very Good"}
                {rating === 3 && "Good"}
                {rating === 2 && "Fair"}
                {rating === 1 && "Poor"}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-zinc-300 text-sm font-semibold mb-2">
              Review Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you liked or disliked about this product..."
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gold)] transition-colors text-sm"
              disabled={loading}
              required
            />
          </div>

          {/* Image attachments (optional URLs) */}
          <div>
            <label className="block text-zinc-300 text-sm font-semibold mb-2">
              Add Photos (Image URLs)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gold)] transition-colors text-sm"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddImage}
                disabled={loading || !newImageUrl.trim()}
                className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 hover:border-[var(--gold)] text-white p-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <FiPlus size={20} />
              </button>
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group w-14 h-14 rounded-md overflow-hidden border border-zinc-700">
                    <img src={img} alt="review preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit/Cancel buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-zinc-850 hover:border-zinc-750 hover:bg-zinc-900 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold rounded-lg text-sm shadow-md transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
