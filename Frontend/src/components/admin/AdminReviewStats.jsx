import React from "react";
import { FiMessageSquare, FiStar, FiEye, FiEyeOff, FiAlertTriangle } from "react-icons/fi";

const AdminReviewStats = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      label: "Total Reviews",
      value: stats.totalReviews || 0,
      icon: <FiMessageSquare size={20} className="text-blue-400" />,
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Average Rating",
      value: `${(stats.averageRating || 0.0).toFixed(1)} / 5.0`,
      icon: <FiStar size={20} className="text-[var(--gold)]" />,
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Visible Reviews",
      value: stats.visibleReviews || 0,
      icon: <FiEye size={20} className="text-green-400" />,
      bg: "bg-green-500/10 border-green-500/20",
    },
    {
      label: "Hidden Reviews",
      value: stats.hiddenReviews || 0,
      icon: <FiEyeOff size={20} className="text-red-400" />,
      bg: "bg-red-500/10 border-red-500/20",
    },
    {
      label: "Reported Flagged",
      value: stats.reportedReviews || 0,
      icon: <FiAlertTriangle size={20} className="text-amber-500" />,
      bg: "bg-orange-500/10 border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map((c, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-xl border ${c.bg} flex flex-col justify-between h-28 hover:translate-y-[-2px] transition-transform`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              {c.label}
            </span>
            {c.icon}
          </div>
          <p className="text-xl md:text-2xl font-black text-white">{c.value}</p>
        </div>
      ))}
    </div>
  );
};

export default AdminReviewStats;
