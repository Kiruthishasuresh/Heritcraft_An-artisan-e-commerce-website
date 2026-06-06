import React from "react";
import { FiSearch, FiSliders } from "react-icons/fi";

const AdminReviewFilters = ({ filters, onChange }) => {
  const handleTextChange = (e) => {
    onChange({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (e) => {
    onChange({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl mb-6 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400">
        <FiSliders size={14} className="text-[var(--gold)]" />
        <span>Filter Controls</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
            <FiSearch size={14} />
          </span>
          <input
            type="text"
            name="search"
            value={filters.search || ""}
            onChange={handleTextChange}
            placeholder="Search product, seller, buyer..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gold)] transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            name="status"
            value={filters.status || ""}
            onChange={handleSelectChange}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--gold)] transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="VISIBLE">Visible</option>
            <option value="REPORTED">Reported</option>
            <option value="HIDDEN">Hidden</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="DELETED">Deleted (Soft-deleted)</option>
          </select>
        </div>

        {/* Rating Filter */}
        <div>
          <select
            name="rating"
            value={filters.rating || ""}
            onChange={handleSelectChange}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--gold)] transition-colors cursor-pointer"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        {/* Reset button */}
        <div>
          <button
            onClick={() => onChange({ search: "", status: "", rating: "" })}
            className="w-full px-4 py-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReviewFilters;
