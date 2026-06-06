import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import { FiShoppingCart, FiStar, FiHeart } from "react-icons/fi";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const toast = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const p = product;
  const id = p.id || p._id;
  const image = p.images?.[0] || p.media?.[0]?.url || p.image || "/placeholder-product.svg";
  const price = p.price || 0;
  const oldPrice = p.oldPrice || 0;
  const offer = p.offer || (oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0);
  const rating = p.averageRating || 0;
  const numReviews = p.numReviews || 0;
  const stock = p.stock ?? 0;
  const soldQty = p.soldQuantity || 0;

  const formatCurrency = (v) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  const handleAddToCart = (e) => {
    e.stopPropagation();

    if (user && user.role !== "buyer") {
      toast.error("Only buyers can use the cart");
      return;
    }

    const hasOptions =
      (p.sizes && p.sizes.length > 0) ||
      (p.weights && p.weights.length > 0) ||
      (p.lengths && p.lengths.length > 0) ||
      (p.volumes && p.volumes.length > 0) ||
      (p.quantities && p.quantities.length > 0);

    if (hasOptions) {
      navigate(`/products/${id}`);
      return;
    }

    if (stock === 0) {
      toast.error("Product is out of stock");
      return;
    }

    addToCart(id, 1, {
      _id: id, id, name: p.name, price, oldPrice,
      images: p.images || [image], category: p.category,
      sellerName: p.sellerName, sellerShopName: p.sellerShopName,
      sellerId: p.sellerId, stock,
    }, {
      selectedSize: null,
      selectedWeight: null,
      selectedLength: null,
      selectedVolume: null,
      selectedQuantityOption: null
    });
    toast.success(`${p.name} added to cart`);
  };

  return (
    <div
      className="product-card"
      onClick={() => navigate(`/products/${id}`)}
    >
      {/* Wishlist Heart */}
      {(!user || user.role === "buyer") && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
          style={{
            position: "absolute", top: 10, left: 10, zIndex: 3,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(0,0,0,0.55)", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          title={isInWishlist(id) ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <FiHeart
            size={18}
            style={{
              color: isInWishlist(id) ? "#ef4444" : "#fff",
              fill: isInWishlist(id) ? "#ef4444" : "none",
            }}
          />
        </button>
      )}

      {/* Discount Badge */}
      {offer > 0 && (
        <div className="discount-badge">
          {offer}% OFF
        </div>
      )}

      {/* Out of Stock Overlay */}
      {stock === 0 && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1,
          background: "rgba(0,0,0,0.6)", borderRadius: "18px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 16, background: "rgba(0,0,0,0.8)", padding: "8px 16px", borderRadius: 8 }}>
            Out of Stock
          </span>
        </div>
      )}

      {/* Image */}
      <div className="product-card-image-wrap">
        <img
          src={image}
          alt={p.name}
          className="product-card-image"
          loading="lazy"
          onError={(e) => { e.target.src = "/placeholder-product.svg"; }}
        />
      </div>

      {/* Info */}
      <div className="product-card-body">
        {/* Seller */}
        <p className="product-card-seller">
          {p.sellerShopName || p.seller?.shopName || p.sellerName || "HeritCraft Seller"}
        </p>

        {/* Name */}
        <h3 className="product-card-title" title={p.name}>{p.name}</h3>

        {/* Rating */}
        <div className="product-card-rating">
          <FiStar size={15} style={{ color: rating > 0 ? "#d4af37" : "#555", fill: rating > 0 ? "#d4af37" : "none" }} />
          <span style={{ color: rating > 0 ? "#d4af37" : "#666", fontSize: 14, fontWeight: 600 }}>
            {rating > 0 ? rating.toFixed(1) : "No ratings"}
          </span>
          {numReviews > 0 && <span style={{ color: "#888", fontSize: 13 }}>({numReviews})</span>}
          {soldQty > 0 && <span style={{ color: "#888", fontSize: 13, marginLeft: "auto" }}>{soldQty} sold</span>}
        </div>

        {/* Price */}
        <div className="product-card-price-row">
          <span style={{ color: "var(--gold)", fontWeight: 800, fontSize: 22 }}>{formatCurrency(price)}</span>
          {oldPrice > price && (
            <span style={{ color: "#8b8b8b", textDecoration: "line-through", fontSize: 14 }}>{formatCurrency(oldPrice)}</span>
          )}
        </div>

        {/* Stock indicator */}
        <p className="product-card-stock">
          {stock > 0 && stock < 10 ? `Only ${stock} left` : "\u00A0"}
        </p>

        {/* Add to Cart */}
        <div className="product-card-footer">
          <button
            onClick={handleAddToCart}
            disabled={stock === 0}
            className="product-card-btn"
          >
            <FiShoppingCart size={18} />
            {stock === 0 ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;