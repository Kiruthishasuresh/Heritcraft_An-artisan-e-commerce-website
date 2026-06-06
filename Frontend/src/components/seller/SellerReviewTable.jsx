import React from "react";
import StarRating from "../StarRating";

const SellerReviewTable = ({ reviews, onViewDetails }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        No reviews yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider bg-zinc-950/40">
            <th className="p-4">Product</th>
            <th className="p-4">Buyer</th>
            <th className="p-4">Rating</th>
            <th className="p-4">Comment</th>
            <th className="p-4">Date</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60 text-zinc-300 text-xs">
          {reviews.map((review) => (
            <tr key={review.id} className="hover:bg-zinc-850/40 transition-colors">
              <td className="p-4 max-w-[200px]">
                <div className="flex items-center gap-3">
                  {review.productImage ? (
                    <img
                      src={review.productImage}
                      alt={review.productName}
                      className="w-10 h-10 object-cover rounded border border-zinc-800 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-zinc-800 rounded border border-zinc-750 flex-shrink-0" />
                  )}
                  <span className="font-semibold truncate text-white hover:text-[var(--gold)] cursor-pointer">
                    {review.productName}
                  </span>
                </div>
              </td>
              <td className="p-4 font-medium text-white">{review.userName}</td>
              <td className="p-4">
                <div className="flex items-center">
                  <StarRating rating={review.rating} readonly size={12} />
                  <span className="ml-1 text-[var(--gold)] font-bold">{review.rating}</span>
                </div>
              </td>
              <td className="p-4 max-w-[250px] truncate text-zinc-400">
                {review.comment}
              </td>
              <td className="p-4 text-zinc-500 whitespace-nowrap">{formatDate(review.createdAt)}</td>
              <td className="p-4 text-right whitespace-nowrap">
                <button
                  onClick={() => onViewDetails(review)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 hover:text-white text-[11px] font-semibold transition-all border border-zinc-700"
                >
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SellerReviewTable;
