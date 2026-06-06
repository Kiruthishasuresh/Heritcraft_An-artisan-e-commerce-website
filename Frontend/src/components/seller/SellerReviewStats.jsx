import React from "react";
import StarRating from "../StarRating";

const SellerReviewStats = ({ stats }) => {
  if (!stats) return null;

  const {
    totalReviews = 0,
    averageRating = 0,
    fiveStar = 0,
    fourStar = 0,
    threeStar = 0,
    twoStar = 0,
    oneStar = 0,
  } = stats;

  const starRows = [
    { label: "5 Star", count: fiveStar },
    { label: "4 Star", count: fourStar },
    { label: "3 Star", count: threeStar },
    { label: "2 Star", count: twoStar },
    { label: "1 Star", count: oneStar },
  ];

  const getPercentage = (count) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-zinc-900 border border-zinc-800 rounded-xl mb-6">
      {/* Overview Block */}
      <div className="flex flex-col items-center justify-center text-center p-4 border-r border-zinc-800 last:border-0 md:border-r md:border-zinc-800 md:last:border-r-0">
        <h3 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-2">
          Average Rating
        </h3>
        <p className="text-5xl font-black text-white mb-2">{averageRating.toFixed(1)}</p>
        <StarRating rating={Math.round(averageRating)} readonly size={22} />
        <p className="text-xs text-zinc-500 mt-2">Based on {totalReviews} reviews</p>
      </div>

      {/* Progress Breakdown */}
      <div className="md:col-span-2 flex flex-col justify-center p-4">
        <h3 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-4">
          Review Distribution
        </h3>
        <div className="space-y-3">
          {starRows.map((row, index) => {
            const pct = getPercentage(row.count);
            return (
              <div key={index} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-400 w-12 font-medium">{row.label}</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-zinc-400 w-8 text-right">{pct}%</span>
                <span className="text-zinc-500 w-12 text-right">({row.count})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SellerReviewStats;
