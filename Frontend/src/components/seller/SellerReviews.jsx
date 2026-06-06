import React, { useState, useEffect } from "react";
import { reviewAPI } from "../../services/api";
import SellerReviewStats from "./SellerReviewStats";
import SellerReviewCard from "./SellerReviewCard";
import SellerReviewTable from "./SellerReviewTable";
import { FiLoader, FiRefreshCw, FiGrid, FiList, FiX } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const SellerReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' or 'table'
  const [selectedReview, setSelectedReview] = useState(null); // for detail modal

  const loadReviewsData = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const reviewsRes = await reviewAPI.getBySeller(user.id).catch((err) => {
        console.error("Seller reviews fetch failed:", err);
        setError("Failed to load review data. Please try again.");
        return { data: [] };
      });

      const statsRes = await reviewAPI.getSellerStats(user.id).catch((err) => {
        console.error("Seller review stats fetch failed:", err);
        return {
          data: {
            sellerId: user.id,
            totalReviews: 0,
            averageRating: 0.0,
            fiveStar: 0,
            fourStar: 0,
            threeStar: 0,
            twoStar: 0,
            oneStar: 0,
          },
        };
      });

      setReviews(reviewsRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error("Unexpected error loading seller reviews:", err);
      setError("Failed to load review data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewsData();
  }, [user?.id]);

  if (loading && reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <FiLoader className="animate-spin mb-3" size={30} />
        <span>Loading reviews...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Customer Reviews</h2>
          <p className="text-xs text-zinc-400">
            Monitor and respond to reviews written for your handmade products
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded transition-all ${
                viewMode === "cards" ? "bg-[var(--gold)] text-black" : "text-zinc-400 hover:text-white"
              }`}
              title="Cards View"
            >
              <FiGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded transition-all ${
                viewMode === "table" ? "bg-[var(--gold)] text-black" : "text-zinc-400 hover:text-white"
              }`}
              title="Table View"
            >
              <FiList size={16} />
            </button>
          </div>

          <button
            onClick={loadReviewsData}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs text-white transition-all"
            title="Refresh reviews"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-900 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Analytics Stats */}
      {stats && <SellerReviewStats stats={stats} />}

      {/* Reviews Content */}
      {!error && (
        reviews.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
            <p className="text-zinc-400 text-sm mb-1 font-medium">No reviews yet</p>
            <p className="text-xs text-zinc-500">
              Reviews will appear here once buyers review your items
            </p>
          </div>
        ) : viewMode === "cards" ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <SellerReviewCard
                key={review.id}
                review={review}
                onUpdate={loadReviewsData}
              />
            ))}
          </div>
        ) : (
          <SellerReviewTable
            reviews={reviews}
            onViewDetails={(review) => setSelectedReview(review)}
          />
        )
      )}

      {/* Detail/Moderation Modal for Seller */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl bg-zinc-950 border border-[var(--gold)] rounded-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedReview(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
            >
              <FiX size={24} />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Review Details</h3>
            
            <SellerReviewCard
              review={selectedReview}
              onUpdate={() => {
                loadReviewsData();
                // Refresh modal state
                const updated = reviews.find((r) => r.id === selectedReview.id);
                if (updated) setSelectedReview(updated);
                else setSelectedReview(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerReviews;
