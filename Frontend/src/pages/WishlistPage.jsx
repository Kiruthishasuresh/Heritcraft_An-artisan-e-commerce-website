import { useNavigate } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { FiHeart, FiShoppingCart, FiTrash2, FiArrowRight } from "react-icons/fi";

const WishlistPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    wishlistItems,
    wishlistCount,
    wishlistLoading,
    removeFromWishlist,
    clearWishlist,
    moveToCart,
  } = useWishlist();

  // Redirect seller/admin away
  if (user && (user.role === "seller" || user.role === "admin")) {
    return (
      <div className="page-wrap" style={{ textAlign: "center", padding: 100 }}>
        <p style={{ color: "#888" }}>Wishlist is not available for your account type.</p>
        <button
          onClick={() => navigate(user.role === "admin" ? "/admin" : "/seller")}
          className="btn-gold"
          style={{ marginTop: 16, padding: "10px 24px" }}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const formatCurrency = (v) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v || 0);

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear your entire wishlist?")) {
      clearWishlist();
    }
  };

  if (wishlistLoading) {
    return (
      <div className="page-wrap" style={{ display: "flex", justifyContent: "center", padding: 100 }}>
        <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-wrap" style={{ paddingTop: 32, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--gold)", margin: 0 }}>
            My Wishlist
          </h1>
          <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
            {wishlistCount} {wishlistCount === 1 ? "item" : "items"}
          </p>
        </div>
        {wishlistCount > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              padding: "10px 20px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              color: "#ef4444",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FiTrash2 size={14} /> Clear All
          </button>
        )}
      </div>

      {/* Empty State */}
      {wishlistCount === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "80px 20px",
          background: "#141414",
          borderRadius: 20,
          border: "1px solid rgba(212,175,55,0.10)",
        }}>
          <FiHeart size={64} style={{ color: "#333", margin: "0 auto 20px", display: "block" }} />
          <h2 style={{ fontFamily: "var(--font-heading)", color: "#fff", fontSize: "1.5rem", marginBottom: 8 }}>
            Your wishlist is empty
          </h2>
          <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
            Save items you love to your wishlist and come back to them later.
          </p>
          <button
            onClick={() => navigate("/products")}
            className="btn-gold"
            style={{ padding: "14px 32px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            Continue Shopping <FiArrowRight size={16} />
          </button>
        </div>
      ) : (
        /* Wishlist Grid */
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
        }}>
          {wishlistItems.map((item) => {
            const productId = item.productId;
            const inStock = item.stock > 0;

            return (
              <div
                key={productId}
                style={{
                  background: "#141414",
                  borderRadius: 16,
                  border: "1px solid rgba(212,175,55,0.10)",
                  padding: 20,
                  display: "flex",
                  gap: 16,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.10)")}
              >
                {/* Image */}
                <div
                  style={{ width: 120, height: 120, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#0d0d0d", cursor: "pointer" }}
                  onClick={() => navigate(`/products/${productId}`)}
                >
                  <img
                    src={item.image || "/placeholder-product.svg"}
                    alt={item.productName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.src = "/placeholder-product.svg"; }}
                  />
                </div>

                {/* Details */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <h3
                    onClick={() => navigate(`/products/${productId}`)}
                    style={{
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 4,
                      cursor: "pointer",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.productName}
                  </h3>

                  <p style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>
                    {item.sellerShopName || item.sellerName || "HeritCraft Seller"}
                  </p>

                  <p style={{ color: "var(--gold)", fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                    {formatCurrency(item.price)}
                  </p>

                  <p style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: inStock ? "#22c55e" : "#ef4444",
                    marginBottom: 12,
                  }}>
                    {inStock ? "In Stock" : "Out of Stock"}
                  </p>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    <button
                      onClick={() => moveToCart(item, navigate)}
                      disabled={!inStock}
                      style={{
                        flex: 1,
                        padding: "8px 14px",
                        background: inStock ? "linear-gradient(135deg, #d4af37, #b8860b)" : "#333",
                        border: "none",
                        borderRadius: 999,
                        color: inStock ? "#000" : "#666",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: inStock ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <FiShoppingCart size={14} /> Move to Cart
                    </button>

                    <button
                      onClick={() => removeFromWishlist(productId)}
                      style={{
                        padding: "8px 14px",
                        background: "transparent",
                        border: "1px solid rgba(239,68,68,0.4)",
                        borderRadius: 999,
                        color: "#ef4444",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <FiTrash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
