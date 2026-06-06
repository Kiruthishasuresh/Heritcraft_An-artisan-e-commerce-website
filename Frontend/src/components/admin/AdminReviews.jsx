import React, { useState, useEffect } from "react";
import { reviewAPI } from "../../services/api";
import AdminReviewStats from "./AdminReviewStats";
import AdminReviewFilters from "./AdminReviewFilters";
import AdminReviewTable from "./AdminReviewTable";
import AdminReviewModerationModal from "./AdminReviewModerationModal";
import { FiLoader, FiRefreshCw } from "react-icons/fi";

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReview, setSelectedReview] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    rating: "",
  });

  const loadAdminReviewsData = async () => {
    setLoading(true);
    setError("");
    try {
      const reviewsRes = await reviewAPI.getAllForAdmin().catch((err) => {
        console.error("Admin reviews fetch failed:", err);
        setError("Failed to fetch platform review data.");
        return { data: [] };
      });

      const statsRes = await reviewAPI.getAdminStats().catch((err) => {
        console.error("Admin review stats fetch failed:", err);
        return {
          data: {
            totalReviews: 0,
            averageRating: 0.0,
            visibleReviews: 0,
            hiddenReviews: 0,
            reportedReviews: 0,
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
      console.error("Unexpected error loading admin reviews:", err);
      setError("Failed to fetch platform review data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminReviewsData();
  }, []);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Filter reviews locally
  const filteredReviews = reviews.filter((review) => {
    // Search filter
    const query = filters.search.toLowerCase().trim();
    if (query) {
      const matchProduct = review.productName?.toLowerCase().includes(query);
      const matchSeller =
        review.sellerName?.toLowerCase().includes(query) ||
        review.sellerShopName?.toLowerCase().includes(query);
      const matchBuyer =
        review.userName?.toLowerCase().includes(query) ||
        review.buyerEmail?.toLowerCase().includes(query);

      if (!matchProduct && !matchSeller && !matchBuyer) {
        return false;
      }
    }

    // Status filter
    if (filters.status && review.status !== filters.status) {
      return false;
    }

    // Rating filter
    if (filters.rating && review.rating !== parseInt(filters.rating)) {
      return false;
    }

    return true;
  });

  if (loading && reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <FiLoader className="animate-spin mb-3" size={30} />
        <span>Loading platform reviews...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Review Moderation</h2>
          <p className="text-xs text-zinc-400">
            Moderate, approve, reject, hide, or soft-delete product reviews across the HeritCraft platform
          </p>
        </div>

        <button
          onClick={loadAdminReviewsData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs text-white transition-all font-semibold"
          title="Refresh statistics and reviews"
        >
          <FiRefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-900 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Analytics Stats */}
      {stats && <AdminReviewStats stats={stats} />}

      {/* Search & Filter bar */}
      <AdminReviewFilters filters={filters} onChange={handleFilterChange} />

      {/* Main Reviews Table */}
      {!error && (
        <AdminReviewTable
          reviews={filteredReviews}
          hasAnyReviews={reviews.length > 0}
          onModerate={(review) => setSelectedReview(review)}
        />
      )}

      {/* Moderation Modal overlay */}
      {selectedReview && (
        <AdminReviewModerationModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onUpdate={() => {
            loadAdminReviewsData();
            // Refresh modal review if status changed
            const updated = reviews.find((r) => r.id === selectedReview.id);
            if (updated) setSelectedReview(updated);
            else setSelectedReview(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminReviews;
