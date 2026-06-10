import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productAPI, reviewAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import ProductCard from "../components/ProductCard";
import ReviewCard from "../components/reviews/ReviewCard";
import { FiShoppingCart, FiStar, FiTruck, FiShield, FiPackage, FiUser, FiMinus, FiPlus, FiChevronLeft, FiHeart } from "react-icons/fi";
import { useWishlist } from "../context/WishlistContext";
import BackButton from "../components/common/BackButton";

const sizePriceMap = { XS: 0.9, S: 0.95, M: 1, L: 1.1, XL: 1.2, XXL: 1.35, "Free Size": 1 };
const weightPriceMap = { "100g": 1, "250g": 2.5, "500g": 4.5, "1kg": 8, "2kg": 13 };

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const toast = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedWeight, setSelectedWeight] = useState(null);
  const [selectedLength, setSelectedLength] = useState(null);
  const [selectedVolume, setSelectedVolume] = useState(null);
  const [selectedQuantityOption, setSelectedQuantityOption] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prodRes, reviewRes, allRes] = await Promise.all([
          productAPI.getOne(id),
          reviewAPI.getByProduct(id),
          productAPI.getAll(),
        ]);
        const p = prodRes.data;
        setProduct(p);
        setReviews(reviewRes.data || []);
        setRelated((allRes.data || []).filter(r => r.category === p.category && (r.id || r._id) !== id).slice(0, 4));
        if (p.sizes?.length > 0) setSelectedSize(p.sizes[0]);
        if (p.weights?.length > 0) setSelectedWeight(p.weights[0]);
        if (p.lengths?.length > 0) setSelectedLength(p.lengths[0]);
        if (p.volumes?.length > 0) setSelectedVolume(p.volumes[0]);
        if (p.quantities?.length > 0) setSelectedQuantityOption(p.quantities[0]);
        setSelectedImage(0);
        setQuantity(1);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return <div className="page-wrap" style={{ display: "flex", justifyContent: "center", padding: 100 }}><div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!product) return <div className="page-wrap" style={{ textAlign: "center", padding: 100 }}><p style={{ color: "#888" }}>Product not found</p></div>;

  const p = product;
  const images = p.images?.length > 0 ? p.images : ["/placeholder-product.svg"];
  const basePrice = p.price || 0;
  const stock = p.stock ?? 0;

  let finalPrice = basePrice;
  if (selectedSize && sizePriceMap[selectedSize]) finalPrice = basePrice * sizePriceMap[selectedSize];
  if (selectedWeight && weightPriceMap[selectedWeight]) finalPrice = basePrice * weightPriceMap[selectedWeight];
  finalPrice = Math.round(finalPrice);

  const formatCurrency = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  const handleAddToCart = () => {
    if (user && user.role !== "buyer") {
      toast.error("Only buyers can use the cart");
      return;
    }
    if (stock === 0) {
      toast.error("Product is out of stock");
      return;
    }

    if (p.sizes?.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    if (p.weights?.length > 0 && !selectedWeight) {
      toast.error("Please select a weight");
      return;
    }
    if (p.lengths?.length > 0 && !selectedLength) {
      toast.error("Please select a length");
      return;
    }
    if (p.volumes?.length > 0 && !selectedVolume) {
      toast.error("Please select a volume");
      return;
    }
    if (p.quantities?.length > 0 && !selectedQuantityOption) {
      toast.error("Please select a quantity option");
      return;
    }

    const selectedOptions = {
      selectedSize,
      selectedWeight,
      selectedLength,
      selectedVolume,
      selectedQuantityOption
    };

    addToCart(
      p.id || p._id,
      quantity,
      {
        _id: p.id || p._id,
        id: p.id || p._id,
        name: p.name,
        price: finalPrice,
        oldPrice: p.oldPrice,
        images,
        category: p.category,
        sellerName: p.sellerName,
        sellerShopName: p.sellerShopName,
        sellerId: p.sellerId,
        stock
      },
      selectedOptions
    );
    toast.success("Added to cart");
  };

  const handleBuyNow = () => {
    if (user && user.role !== "buyer") {
      toast.error("Only buyers can checkout");
      return;
    }
    if (stock === 0) {
      toast.error("Out of stock");
      return;
    }

    if (p.sizes?.length > 0 && !selectedSize) { toast.error("Please select a size"); return; }
    if (p.weights?.length > 0 && !selectedWeight) { toast.error("Please select a weight"); return; }
    if (p.lengths?.length > 0 && !selectedLength) { toast.error("Please select a length"); return; }
    if (p.volumes?.length > 0 && !selectedVolume) { toast.error("Please select a volume"); return; }
    if (p.quantities?.length > 0 && !selectedQuantityOption) { toast.error("Please select a quantity option"); return; }

    const selectedOptions = {
      selectedSize,
      selectedWeight,
      selectedLength,
      selectedVolume,
      selectedQuantityOption
    };

    addToCart(
      p.id || p._id,
      quantity,
      {
        _id: p.id || p._id,
        id: p.id || p._id,
        name: p.name,
        price: finalPrice,
        oldPrice: p.oldPrice,
        images,
        category: p.category,
        sellerName: p.sellerName,
        sellerShopName: p.sellerShopName,
        sellerId: p.sellerId,
        stock
      },
      selectedOptions
    );

    navigate("/checkout");
  };

  const getEmbeddedVideo = (url) => {
    if (!url) return null;
    let embedUrl = null;

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId = "";
      if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0];
      } else if (url.includes("v=")) {
        videoId = url.split("v=")[1]?.split("&")[0];
      } else if (url.includes("embed/")) {
        videoId = url.split("embed/")[1]?.split("?")[0];
      }
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (url.includes("drive.google.com")) {
      const parts = url.split("/d/");
      if (parts.length > 1) {
        const fileId = parts[1].split("/")[0];
        embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          style={{ width: "100%", height: 360, borderRadius: 12, border: "none", background: "#000" }}
          allowFullScreen
          title={p.makingVideoTitle || "Making Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      );
    }

    const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || url.includes("/video/");
    if (isDirectVideo) {
      return (
        <video
          src={url}
          controls
          style={{ width: "100%", height: 360, borderRadius: 12, objectFit: "cover", background: "#000" }}
        />
      );
    }

    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold"
          style={{ display: "inline-flex", padding: "12px 32px", textDecoration: "none", color: "#000", fontWeight: 600 }}
        >
          Watch Making Video: {p.makingVideoTitle || "View Video"}
        </a>
      </div>
    );
  };

  return (
    <div className="page-wrap" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <div style={{ marginBottom: 18 }}>
        <BackButton fallback="/products" label="Back to Products" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 48 }} className="product-detail-grid">
        {/* LEFT — Images */}
        <div>
          <div style={{ background: "#141414", borderRadius: 16, overflow: "hidden", marginBottom: 12, position: "relative", aspectRatio: "1" }}>
            {p.offer > 0 && (
              <div style={{ position: "absolute", top: 14, left: 14, background: "linear-gradient(135deg,#d4af37,#b8860b)", color: "#000", fontWeight: 700, fontSize: 13, padding: "5px 12px", borderRadius: 8, zIndex: 2 }}>
                {p.offer}% OFF
              </div>
            )}
            <img src={images[selectedImage]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { e.target.src = "/placeholder-product.svg"; }} />
          </div>
          {images.length > 1 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {images.map((img, i) => (
                <img key={i} src={img} alt="" onClick={() => setSelectedImage(i)}
                  style={{ width: 70, height: 70, borderRadius: 10, objectFit: "cover", cursor: "pointer", border: selectedImage === i ? "2px solid #d4af37" : "2px solid transparent", opacity: selectedImage === i ? 1 : 0.6 }}
                  onError={e => { e.target.src = "https://via.placeholder.com/70"; }} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Info */}
        <div>
          {(p.sellerShopName || p.seller?.shopName) && (
            <p style={{ color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              {p.sellerShopName || p.seller?.shopName}
            </p>
          )}
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "#fff", marginBottom: 10 }}>{p.name}</h1>

          {/* Rating */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <FiStar key={n} size={16} style={{ color: n <= Math.round(p.averageRating || 0) ? "#d4af37" : "#555", fill: n <= Math.round(p.averageRating || 0) ? "#d4af37" : "none" }} />
            ))}
            <span style={{ color: "#d4af37", fontWeight: 600 }}>{(p.averageRating || 0).toFixed(1)}</span>
            <span style={{ color: "#888", fontSize: 13 }}>({p.numReviews || 0} reviews)</span>
            {(p.soldQuantity || 0) > 0 && <span style={{ color: "#888", fontSize: 13, marginLeft: 8 }}>{p.soldQuantity} sold</span>}
          </div>

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
            <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: 32, fontFamily: "var(--font-heading)" }}>{formatCurrency(finalPrice)}</span>
            {p.oldPrice > p.price && (
              <>
                <span style={{ color: "#666", textDecoration: "line-through", fontSize: 18 }}>{formatCurrency(p.oldPrice)}</span>
                <span style={{ color: "#22c55e", fontWeight: 600, fontSize: 15 }}>{p.offer}% off</span>
              </>
            )}
          </div>

          {/* Stock Status */}
          <div style={{ marginBottom: 20 }}>
            {stock === 0 ? (
              <span style={{ color: "#ef4444", fontWeight: 600, fontSize: 14 }}>Out of Stock</span>
            ) : stock < 10 ? (
              <span style={{ color: "#f59e0b", fontWeight: 500, fontSize: 14 }}>Only {stock} left in stock</span>
            ) : (
              <span style={{ color: "#22c55e", fontWeight: 500, fontSize: 14 }}>In Stock</span>
            )}
          </div>

          {/* Size Selector */}
          {p.sizes?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Size</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.sizes.map(s => (
                  <button key={s} onClick={() => setSelectedSize(s)} style={{
                    padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                    background: selectedSize === s ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                    border: selectedSize === s ? "1px solid #d4af37" : "1px solid #333",
                    color: selectedSize === s ? "#d4af37" : "#999",
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* We'll inject other selectors here dynamically */}
          {null}

          {/* Weight Selector */}
          {p.weights?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Weight</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.weights.map(w => (
                  <button key={w} onClick={() => setSelectedWeight(w)} style={{
                    padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                    background: selectedWeight === w ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                    border: selectedWeight === w ? "1px solid #d4af37" : "1px solid #333",
                    color: selectedWeight === w ? "#d4af37" : "#999",
                  }}>{w}</button>
                ))}
              </div>
            </div>
          )}

          {/* Length Selector */}
          {p.lengths?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Length</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.lengths.map(l => (
                  <button key={l} onClick={() => setSelectedLength(l)} style={{
                    padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                    background: selectedLength === l ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                    border: selectedLength === l ? "1px solid #d4af37" : "1px solid #333",
                    color: selectedLength === l ? "#d4af37" : "#999",
                  }}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Volume Selector */}
          {p.volumes?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Volume</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.volumes.map(v => (
                  <button key={v} onClick={() => setSelectedVolume(v)} style={{
                    padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                    background: selectedVolume === v ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                    border: selectedVolume === v ? "1px solid #d4af37" : "1px solid #333",
                    color: selectedVolume === v ? "#d4af37" : "#999",
                  }}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          {p.quantities?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Quantity Option</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.quantities.map(q => (
                  <button key={q} onClick={() => setSelectedQuantityOption(q)} style={{
                    padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                    background: selectedQuantityOption === q ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                    border: selectedQuantityOption === q ? "1px solid #d4af37" : "1px solid #333",
                    color: selectedQuantityOption === q ? "#d4af37" : "#999",
                  }}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <p style={{ color: "#ccc", fontSize: 13, fontWeight: 500 }}>Quantity</p>
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#1a1a1a", borderRadius: 8, border: "1px solid #333" }}>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: "8px 12px", background: "none", border: "none", color: "#ddd", cursor: "pointer" }}><FiMinus size={14} /></button>
              <span style={{ padding: "8px 16px", color: "#fff", fontWeight: 600, minWidth: 40, textAlign: "center" }}>{quantity}</span>
              <button onClick={() => setQuantity(Math.min(stock || 99, quantity + 1))} style={{ padding: "8px 12px", background: "none", border: "none", color: "#ddd", cursor: "pointer" }}><FiPlus size={14} /></button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <button onClick={handleAddToCart} disabled={stock === 0} className="btn-gold" style={{ flex: 1, padding: "14px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: stock === 0 ? 0.5 : 1 }}>
              <FiShoppingCart size={18} /> Add to Cart
            </button>
            <button onClick={handleBuyNow} disabled={stock === 0} style={{ flex: 1, padding: "14px", fontSize: 15, background: "#1a1a1a", border: "1px solid #d4af37", borderRadius: 8, color: "#d4af37", fontWeight: 600, cursor: stock === 0 ? "not-allowed" : "pointer", opacity: stock === 0 ? 0.5 : 1 }}>
              Buy Now
            </button>
          </div>

          {/* Wishlist Button */}
          {(!user || user.role === "buyer") && (
            <button
              onClick={() => toggleWishlist(p)}
              style={{
                width: "100%", padding: "12px", marginBottom: 24,
                background: isInWishlist(p.id || p._id) ? "rgba(239,68,68,0.08)" : "transparent",
                border: isInWishlist(p.id || p._id) ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(212,175,55,0.3)",
                borderRadius: 8, cursor: "pointer",
                color: isInWishlist(p.id || p._id) ? "#ef4444" : "#d4af37",
                fontWeight: 600, fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s",
              }}
            >
              <FiHeart
                size={18}
                style={{
                  fill: isInWishlist(p.id || p._id) ? "#ef4444" : "none",
                }}
              />
              {isInWishlist(p.id || p._id) ? "In Wishlist" : "Add to Wishlist"}
            </button>
          )}

          {/* Delivery Info */}
          <div style={{ background: "#0d0d0d", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FiTruck size={16} color="#d4af37" />
              <span style={{ color: "#ccc", fontSize: 13 }}>Delivery: {p.deliveryTime || "5-7 business days"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FiShield size={16} color="#d4af37" />
              <span style={{ color: "#ccc", fontSize: 13 }}>Authentic Handmade Product</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FiPackage size={16} color="#d4af37" />
              <span style={{ color: "#ccc", fontSize: 13 }}>Free shipping on orders above ₹500</span>
            </div>
          </div>

          {/* Seller Card */}
          <div style={{ background: "#141414", borderRadius: 12, padding: 16, border: "1px solid rgba(212,175,55,0.10)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {(p.sellerProfileImage || p.seller?.profileImage) ? (
                <img
                  src={p.sellerProfileImage || p.seller?.profileImage}
                  alt={p.sellerShopName || p.sellerName}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid #d4af37" }}
                  onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                />
              ) : null}
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#d4af37,#b8860b)", display: (p.sellerProfileImage || p.seller?.profileImage) ? "none" : "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", fontSize: 16 }}>
                {(p.sellerShopName || p.sellerName || "A").charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{p.sellerShopName || p.sellerName || "Artisan Seller"}</p>
                <p style={{ color: "#888", fontSize: 12 }}>Verified Seller</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Specs */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 48 }} className="product-detail-grid">
        <div>
          {p.description && (
            <div style={{ background: "#141414", borderRadius: 16, padding: 24, marginBottom: 20, border: "1px solid rgba(212,175,55,0.10)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1.2rem", marginBottom: 12 }}>Description</h3>
              <p style={{ color: "#ccc", lineHeight: 1.8, fontSize: 14 }}>{p.description}</p>
            </div>
          )}
          {p.handmadeStory && (
            <div style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(212,175,55,0.10)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1.2rem", marginBottom: 12 }}>The Handmade Story</h3>
              <p style={{ color: "#ccc", lineHeight: 1.8, fontSize: 14, fontStyle: "italic" }}>{p.handmadeStory}</p>
            </div>
          )}
        </div>
        <div style={{ background: "#141414", borderRadius: 16, padding: 24, border: "1px solid rgba(212,175,55,0.10)", alignSelf: "flex-start" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1.1rem", marginBottom: 16 }}>Specifications</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Category", value: p.category },
              { label: "Type", value: p.productType },
              { label: "Material", value: p.material },
              { label: "Delivery", value: p.deliveryTime },
            ].filter(s => s.value).map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid #1a1a1a" }}>
                <span style={{ color: "#888", fontSize: 13 }}>{s.label}</span>
                <span style={{ color: "#ddd", fontSize: 13, fontWeight: 500 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Making Video Section */}
      {p.makingVideoUrl && (
        <div style={{ background: "#141414", borderRadius: 16, padding: 24, marginBottom: 48, border: "1px solid rgba(212,175,55,0.10)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1.4rem", marginBottom: 16 }}>
            {p.makingVideoTitle || "How This Product Was Made"}
          </h2>
          <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: 12 }}>
            {getEmbeddedVideo(p.makingVideoUrl)}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", color: "var(--gold)", marginBottom: 20 }}>
          Customer Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p style={{ color: "#888", background: "#141414", borderRadius: 12, padding: 32, textAlign: "center" }}>No reviews yet. Be the first to review this product.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {reviews.map(r => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", color: "var(--gold)", marginBottom: 20 }}>Related Products</h2>
          <div className="product-grid">
            {related.map(r => <ProductCard key={r.id || r._id} product={r} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;