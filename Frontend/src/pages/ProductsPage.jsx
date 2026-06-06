import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { productAPI } from "../services/api";
import ProductCard from "../components/ProductCard";
import { FiSearch, FiFilter, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";

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
  const [selectedCat, setSelectedCat] = useState(searchParams.get("category") || "");
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
      } catch (e) { console.error(e); }
      setLoading(false);
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

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCat) {
      result = result.filter(p => p.category === selectedCat);
    }

    // Price filter
    if (minPrice) result = result.filter(p => (p.price || 0) >= parseFloat(minPrice));
    if (maxPrice) result = result.filter(p => (p.price || 0) <= parseFloat(maxPrice));

    // Sort
    switch (sortBy) {
      case "newest": result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); break;
      case "oldest": result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)); break;
      case "price_asc": result.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
      case "price_desc": result.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
      case "rating": result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)); break;
    }

    return result;
  }, [products, search, selectedCat, sortBy, minPrice, maxPrice]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.search = search;
    if (selectedCat) params.category = selectedCat;
    setSearchParams(params);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch(""); setSelectedCat(""); setMinPrice(""); setMaxPrice(""); setSortBy("newest");
    setSearchParams({});
    setCurrentPage(1);
  };

  return (
    <div className="page-wrap" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", color: "var(--gold)", textAlign: "center", marginBottom: 8 }}>
        Handmade Products
      </h1>
      <p style={{ color: "#888", textAlign: "center", marginBottom: 32 }}>
        Discover unique artisan creations crafted with love
      </p>

      {/* Search & Filter Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 250, position: "relative" }}>
          <FiSearch style={{ position: "absolute", left: 14, top: 14, color: "#666" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="input-gold" style={{ paddingLeft: 40, width: "100%" }} />
        </form>
        <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setCurrentPage(1); }} className="input-gold" style={{ minWidth: 160 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-gold" style={{ minWidth: 160 }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => setShowFilters(!showFilters)} style={{ background: "#141414", border: "1px solid #333", borderRadius: 8, padding: "10px 16px", cursor: "pointer", color: "#d4af37", display: "flex", alignItems: "center", gap: 6 }}>
          <FiFilter size={16} /> Filters
        </button>
      </div>

      {/* Price Filters */}
      {showFilters && (
        <div style={{ background: "#141414", borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid rgba(212,175,55,0.10)", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ minWidth: 120 }}>
            <label>Min Price</label>
            <input type="number" value={minPrice} onChange={e => { setMinPrice(e.target.value); setCurrentPage(1); }} className="input-gold" placeholder="0" />
          </div>
          <div className="field" style={{ minWidth: 120 }}>
            <label>Max Price</label>
            <input type="number" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); setCurrentPage(1); }} className="input-gold" placeholder="99999" />
          </div>
          <button onClick={clearFilters} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 16px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", gap: 6, height: 42 }}>
            <FiX size={14} /> Clear All
          </button>
        </div>
      )}

      {/* Results Count */}
      <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
        Showing {paginated.length} of {filtered.length} products
        {search && <> for "<span style={{ color: "#d4af37" }}>{search}</span>"</>}
        {selectedCat && <> in <span style={{ color: "#d4af37" }}>{selectedCat}</span></>}
      </p>

      {/* Product Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : paginated.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <p style={{ color: "#888", fontSize: 18 }}>No products found</p>
          <button onClick={clearFilters} className="btn-gold" style={{ marginTop: 16, padding: "10px 24px" }}>Clear Filters</button>
        </div>
      ) : (
        <div className="product-grid">
          {paginated.map(p => <ProductCard key={p.id || p._id} product={p} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 32 }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ background: "#141414", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", cursor: "pointer", color: "#ddd" }}><FiChevronLeft /></button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let page;
            if (totalPages <= 5) page = i + 1;
            else if (currentPage <= 3) page = i + 1;
            else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
            else page = currentPage - 2 + i;
            return (
              <button key={page} onClick={() => setCurrentPage(page)} style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid", borderColor: currentPage === page ? "#d4af37" : "#333", background: currentPage === page ? "rgba(212,175,55,0.15)" : "#141414", color: currentPage === page ? "#d4af37" : "#999", cursor: "pointer", fontWeight: 600 }}>
                {page}
              </button>
            );
          })}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ background: "#141414", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", cursor: "pointer", color: "#ddd" }}><FiChevronRight /></button>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;