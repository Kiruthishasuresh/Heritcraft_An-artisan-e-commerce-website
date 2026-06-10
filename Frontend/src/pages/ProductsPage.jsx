import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { productAPI } from "../services/api";
import ProductCard from "../components/ProductCard";
import {
  FiSearch,
  FiFilter,
  FiX,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
];

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCat, setSelectedCat] = useState(
    searchParams.get("category") || ""
  );
  const [sortBy, setSortBy] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const perPage = 12;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        const [prodRes, catRes] = await Promise.all([
          productAPI.getAll(),
          productAPI.getCategories(),
        ]);

        setProducts(prodRes.data || []);
        setCategories(catRes.data || []);
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setSelectedCat(searchParams.get("category") || "");
    setCurrentPage(1);
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (search) {
      const q = search.toLowerCase();

      result = result.filter(
        (product) =>
          product.name?.toLowerCase().includes(q) ||
          product.category?.toLowerCase().includes(q) ||
          product.description?.toLowerCase().includes(q)
      );
    }

    if (selectedCat) {
      result = result.filter((product) => product.category === selectedCat);
    }

    if (minPrice) {
      result = result.filter(
        (product) => Number(product.price || 0) >= parseFloat(minPrice)
      );
    }

    if (maxPrice) {
      result = result.filter(
        (product) => Number(product.price || 0) <= parseFloat(maxPrice)
      );
    }

    switch (sortBy) {
      case "newest":
        result.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        break;

      case "oldest":
        result.sort(
          (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        );
        break;

      case "price_asc":
        result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;

      case "price_desc":
        result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;

      case "rating":
        result.sort(
          (a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0)
        );
        break;

      default:
        break;
    }

    return result;
  }, [products, search, selectedCat, sortBy, minPrice, maxPrice]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const handleSearch = (e) => {
    e.preventDefault();

    const params = {};

    if (search.trim()) {
      params.search = search.trim();
    }

    if (selectedCat) {
      params.category = selectedCat;
    }

    setSearchParams(params);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCat("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    setSearchParams({});
    setCurrentPage(1);
  };

  return (
    <div className="page-wrap" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "2.5rem",
          color: "var(--gold)",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Handmade Products
      </h1>

      <p style={{ color: "#888", textAlign: "center", marginBottom: 32 }}>
        Discover unique artisan creations crafted with love
      </p>

      {/* Compact Search + Filter Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginBottom: 22,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <form
          onSubmit={handleSearch}
          style={{
            width: "100%",
            maxWidth: 620,
            position: "relative",
          }}
        >
          <FiSearch
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#666",
            }}
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="input-gold"
            style={{
              paddingLeft: 44,
              width: "100%",
              height: 48,
              borderRadius: 16,
              fontSize: 15,
            }}
          />
        </form>

        <button
          onClick={() => setShowFilters((prev) => !prev)}
          style={{
            background: showFilters
              ? "rgba(212,175,55,0.15)"
              : "#141414",
            border: showFilters
              ? "1px solid rgba(212,175,55,0.45)"
              : "1px solid #333",
            borderRadius: 14,
            padding: "13px 18px",
            cursor: "pointer",
            color: "#d4af37",
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 48,
            fontWeight: 700,
          }}
        >
          <FiFilter size={16} /> Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div
          style={{
            background: "#141414",
            borderRadius: 18,
            padding: 22,
            marginBottom: 26,
            border: "1px solid rgba(212,175,55,0.16)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
            alignItems: "end",
            boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
          }}
        >
          <div className="field">
            <label>Category</label>
            <select
              value={selectedCat}
              onChange={(e) => {
                setSelectedCat(e.target.value);
                setCurrentPage(1);
              }}
              className="input-gold"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="input-gold"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Min Price</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value);
                setCurrentPage(1);
              }}
              className="input-gold"
              placeholder="0"
            />
          </div>

          <div className="field">
            <label>Max Price</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setCurrentPage(1);
              }}
              className="input-gold"
              placeholder="99999"
            />
          </div>

          <button
            onClick={clearFilters}
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 12,
              padding: "12px 16px",
              cursor: "pointer",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 48,
              fontWeight: 700,
            }}
          >
            <FiX size={14} /> Clear All
          </button>
        </div>
      )}

      {/* Active Filter Summary */}
      {(selectedCat || sortBy !== "newest" || minPrice || maxPrice) && (
        <div
          style={{
            marginBottom: 18,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {selectedCat && (
            <span
              style={{
                color: "#d4af37",
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 13,
              }}
            >
              Category: {selectedCat}
            </span>
          )}

          {sortBy !== "newest" && (
            <span
              style={{
                color: "#d4af37",
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 13,
              }}
            >
              Sort: {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
            </span>
          )}

          {minPrice && (
            <span
              style={{
                color: "#d4af37",
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 13,
              }}
            >
              Min: ₹{minPrice}
            </span>
          )}

          {maxPrice && (
            <span
              style={{
                color: "#d4af37",
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 13,
              }}
            >
              Max: ₹{maxPrice}
            </span>
          )}
        </div>
      )}

      {/* Results Count */}
      <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
        Showing {paginated.length} of {filtered.length} products
        {search && (
          <>
            {" "}
            for "<span style={{ color: "#d4af37" }}>{search}</span>"
          </>
        )}
        {selectedCat && (
          <>
            {" "}
            in <span style={{ color: "#d4af37" }}>{selectedCat}</span>
          </>
        )}
      </p>

      {/* Product Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : paginated.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <p style={{ color: "#888", fontSize: 18 }}>No products found</p>

          <button
            onClick={clearFilters}
            className="btn-gold"
            style={{ marginTop: 16, padding: "10px 24px" }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {paginated.map((product) => (
            <ProductCard key={product.id || product._id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            marginTop: 32,
          }}
        >
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => page - 1)}
            style={{
              background: "#141414",
              border: "1px solid #333",
              borderRadius: 8,
              padding: "10px 14px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              color: "#ddd",
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            <FiChevronLeft />
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
            let page;

            if (totalPages <= 5) {
              page = index + 1;
            } else if (currentPage <= 3) {
              page = index + 1;
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + index;
            } else {
              page = currentPage - 2 + index;
            }

            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor:
                    currentPage === page ? "#d4af37" : "#333",
                  background:
                    currentPage === page
                      ? "rgba(212,175,55,0.15)"
                      : "#141414",
                  color: currentPage === page ? "#d4af37" : "#999",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {page}
              </button>
            );
          })}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
            style={{
              background: "#141414",
              border: "1px solid #333",
              borderRadius: 8,
              padding: "10px 14px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              color: "#ddd",
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;