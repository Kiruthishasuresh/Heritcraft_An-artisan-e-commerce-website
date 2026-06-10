import { useNavigate } from "react-router-dom";
import { FiTrash2, FiShoppingCart, FiHeart } from "react-icons/fi";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { formatCurrency } from "../utils/helpers";
import { useToast } from "../context/ToastContext";
import BackButton from "../components/common/BackButton";

const WishlistPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    wishlistItems,
    wishlistCount,
    removeFromWishlist,
    clearWishlist,
  } = useWishlist();

  const { addToCart } = useCart();

  const getProductImage = (item) => {
    return (
      item.image ||
      item.images?.[0] ||
      item.media?.find((m) => m.type?.startsWith("image"))?.url ||
      "/placeholder-product.svg"
    );
  };

  const handleMoveToCart = async (item) => {
    const needsOptions =
      item.sizes?.length ||
      item.weights?.length ||
      item.lengths?.length ||
      item.volumes?.length ||
      item.quantityOptions?.length;

    if (needsOptions) {
      navigate(`/products/${item.productId || item.id}`);
      toast.info("Please select product options before adding to cart");
      return;
    }

    await addToCart({
      product: {
        id: item.productId || item.id,
        _id: item.productId || item.id,
        name: item.productName || item.name,
        price: item.price,
        image: item.image,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerShopName: item.sellerShopName,
        stock: item.stock,
      },
      quantity: 1,
    });

    await removeFromWishlist(item.productId || item.id);
    toast.success("Moved to cart");
  };

  if (!wishlistItems || wishlistItems.length === 0) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon">
            <FiHeart size={56} />
          </div>

          <h1>Your wishlist is empty</h1>
          <p>Save your favorite handmade products here.</p>

          <button onClick={() => navigate("/products")} className="btn-gold">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div style={{ marginBottom: 18 }}>
        <BackButton fallback="/products" label="Back to Products" />
      </div>
      <div className="wishlist-header">
        <div>
          <h1>My Wishlist</h1>
          <p>{wishlistCount || wishlistItems.length} items saved</p>
        </div>

        <button onClick={clearWishlist} className="wishlist-clear-btn">
          <FiTrash2 size={16} />
          Clear All
        </button>
      </div>

      <div className="wishlist-grid">
        {wishlistItems.map((item) => {
          const productId = item.productId || item.id;

          return (
            <div className="wishlist-card" key={productId}>
              <div
                className="wishlist-image-wrap"
                onClick={() => navigate(`/products/${productId}`)}
              >
                <img
                  src={getProductImage(item)}
                  alt={item.productName || item.name}
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-product.svg";
                  }}
                />
              </div>

              <div className="wishlist-info">
                <p className="wishlist-shop">
                  {item.sellerShopName || item.sellerName || "HeritCraft Seller"}
                </p>

                <h3
                  onClick={() => navigate(`/products/${productId}`)}
                  title={item.productName || item.name}
                >
                  {item.productName || item.name}
                </h3>

                <p className="wishlist-price">{formatCurrency(item.price)}</p>

                <p
                  className={
                    Number(item.stock || 0) > 0
                      ? "wishlist-stock in-stock"
                      : "wishlist-stock out-stock"
                  }
                >
                  {Number(item.stock || 0) > 0 ? "In Stock" : "Out of Stock"}
                </p>
              </div>

              <div className="wishlist-actions">
                <button
                  className="wishlist-cart-btn"
                  onClick={() => handleMoveToCart(item)}
                  disabled={Number(item.stock || 0) <= 0}
                >
                  <FiShoppingCart size={16} />
                  Move to Cart
                </button>

                <button
                  className="wishlist-remove-btn"
                  onClick={() => removeFromWishlist(productId)}
                >
                  <FiTrash2 size={16} />
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WishlistPage;