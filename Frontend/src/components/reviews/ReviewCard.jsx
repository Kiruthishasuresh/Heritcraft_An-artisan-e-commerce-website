import React from "react";
import StarRating from "../StarRating";

const ReviewCard = ({ review }) => {
  if (!review) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="p-5 rounded-lg bg-zinc-900 border border-zinc-800 mb-4 transition-all hover:border-[var(--gold-muted)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[var(--gold)]">
            {review.userName ? review.userName.charAt(0).toUpperCase() : "B"}
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">{review.userName || "Buyer"}</h4>
            <p className="text-xs text-zinc-400">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <StarRating rating={review.rating} readonly size={16} />
      </div>

      <p className="text-zinc-300 text-sm leading-relaxed mb-4 pl-1">
        {review.comment || "No comment provided."}
      </p>

      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pl-1">
          {review.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Review attachment ${idx + 1}`}
              className="w-16 h-16 object-cover rounded-md border border-zinc-800 hover:border-[var(--gold)] transition-colors cursor-zoom-in"
            />
          ))}
        </div>
      )}

      {review.sellerReply && (
        <div className="mt-4 p-4 rounded-md bg-zinc-950 border-l-2 border-[var(--gold)] pl-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h5 className="text-xs font-semibold text-[var(--gold)] uppercase tracking-wider">
              Response from {review.sellerShopName || review.sellerName || "Seller"}
            </h5>
            <span className="text-[10px] text-zinc-500">
              {formatDate(review.sellerReplyAt)}
            </span>
          </div>
          <p className="text-zinc-400 text-xs italic leading-relaxed">
            "{review.sellerReply}"
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
