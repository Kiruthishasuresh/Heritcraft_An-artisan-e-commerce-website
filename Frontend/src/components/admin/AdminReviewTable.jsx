import React from "react";
import StarRating from "../StarRating";

const AdminReviewTable = ({ reviews, hasAnyReviews, onModerate }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "VISIBLE":
      case "APPROVED":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "REPORTED":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "HIDDEN":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "REJECTED":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "DELETED":
        return "text-zinc-500 bg-zinc-950 border-zinc-800";
      default:
        return "text-gray-400 bg-zinc-900 border-zinc-800";
    }
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        {hasAnyReviews ? "No reviews matching the search criteria" : "No reviews found"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider bg-zinc-950/40">
            <th className="p-4">ID</th>
            <th className="p-4">Product</th>
            <th className="p-4">Seller</th>
            <th className="p-4">Buyer</th>
            <th className="p-4">Rating</th>
            <th className="p-4">Comment</th>
            <th className="p-4">Status</th>
            <th className="p-4">Date</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60 text-zinc-300 text-xs">
          {reviews.map((review) => (
            <tr key={review.id} className="hover:bg-zinc-850/40 transition-colors">
              <td className="p-4 text-zinc-500 font-mono text-[10px]">{review.id}</td>
              <td className="p-4 max-w-[150px]">
                <div className="flex items-center gap-2">
                  {review.productImage ? (
                    <img
                      src={review.productImage}
                      alt={review.productName}
                      className="w-8 h-8 object-cover rounded border border-zinc-850 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-zinc-800 rounded border border-zinc-850 flex-shrink-0" />
                  )}
                  <span className="font-semibold truncate text-white">
                    {review.productName}
                  </span>
                </div>
              </td>
              <td className="p-4 text-zinc-400 truncate max-w-[120px]" title={review.sellerShopName}>
                {review.sellerShopName || review.sellerName}
              </td>
              <td className="p-4 text-zinc-400 truncate max-w-[120px] font-medium" title={review.buyerEmail}>
                {review.userName}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-1">
                  <StarRating rating={review.rating} readonly size={10} />
                  <span className="text-[var(--gold)] font-bold text-[10px]">{review.rating}</span>
                </div>
              </td>
              <td className="p-4 max-w-[180px] truncate text-zinc-400" title={review.comment}>
                {review.comment}
              </td>
              <td className="p-4 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(review.status)}`}>
                  {review.status}
                </span>
              </td>
              <td className="p-4 text-zinc-500 whitespace-nowrap">{formatDate(review.createdAt)}</td>
              <td className="p-4 text-right whitespace-nowrap">
                <button
                  onClick={() => onModerate(review)}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all border border-zinc-700 hover:border-[var(--gold-muted)]"
                >
                  Moderate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminReviewTable;
