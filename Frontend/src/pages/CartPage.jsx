import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/helpers";
import { getCartItemKey } from "../utils/cartUtils";
import {
  FiTrash2,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiLoader,
  FiAlertTriangle
} from "react-icons/fi";

const CartPage = () => {
  const {
    cartItems,
    cartLoading,
    cartError,
    totalItems,
    totalPrice,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect seller/admin
  useEffect(() => {
    if (user) {
      if (user.role === "seller") {
        navigate("/seller", { replace: true });
      } else if (user.role === "admin") {
        navigate("/admin", { replace: true });
      }
    }
  }, [user, navigate]);

  const shipping = totalPrice > 500 ? 0 : 50;
  const tax = Math.round(totalPrice * 0.18);
  const grandTotal = totalPrice + shipping + tax;

  // 1. Loading State
  if (cartLoading && (!cartItems || cartItems.length === 0)) {
    return (
      <div className="page-wrap flex flex-col items-center justify-center py-20 gap-4" style={{ minHeight: "60vh" }}>
        <FiLoader size={60} className="animate-spin text-[var(--gold)]" />
        <p className="text-gray-400 text-lg">Loading your cart...</p>
      </div>
    );
  }

  // 2. Error State
  if (cartError && (!cartItems || cartItems.length === 0)) {
    return (
      <div className="page-wrap text-center py-20" style={{ minHeight: "60vh" }}>
        <FiAlertTriangle size={60} className="text-red-400 mx-auto mb-6" />
        <h1 className="section-title text-red-400 mb-4">Error Loading Cart</h1>
        <p className="section-subtitle mb-8">{cartError}</p>
        <button onClick={() => window.location.reload()} className="btn-gold">
          Retry
        </button>
      </div>
    );
  }

  // 3. Empty State
  if (!cartItems || !cartItems.length) {
    return (
      <div className="page-wrap text-center" style={{ minHeight: "60vh" }}>
        <FiShoppingBag
          size={90}
          className="mx-auto text-gray-500 mb-8"
        />
        <h1 className="section-title">Your cart is empty</h1>
        <p className="section-subtitle mb-8">
          Discover beautiful handcrafted heritage items
        </p>
        <Link to="/products" className="btn-gold text-xl">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const handleCheckoutClick = () => {
    // Navigate to checkout. Under-the-hood, ProtectedRoute handles redirecting guests to / with login modal.
    navigate("/checkout");
  };

  return (
    <div className="page-wrap animate-fadeIn">
      <h1 className="section-title mb-10">
        Shopping Cart ({totalItems} items)
      </h1>

      {cartError && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-center">
          {cartError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* LEFT SIDE */}
        <div className="lg:col-span-2 space-y-5">
          {cartItems.map((item) => {
            const itemKey = getCartItemKey(item);
            const itemImgSrc =
              item.product.images?.[0] ||
              item.product.media?.find((m) => m.type?.startsWith("image"))?.url ||
              item.product.image ||
              "/placeholder-product.svg";

            const stock = item.product?.stock ?? 0;
            const options = {
              selectedSize: item.selectedSize,
              selectedWeight: item.selectedWeight,
              selectedLength: item.selectedLength,
              selectedVolume: item.selectedVolume,
              selectedQuantityOption: item.selectedQuantityOption
            };

            return (
              <div
                key={itemKey}
                className="panel flex gap-5 items-center"
              >
                <img
                  src={itemImgSrc}
                  alt={item.product.name}
                  className="w-36 h-36 rounded-xl object-cover"
                />

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="text-2xl font-bold">
                        {item.product.name}
                      </h3>
                      {(item.product.sellerShopName || item.product.sellerName) && (
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Shop: {item.product.sellerShopName || item.product.sellerName}
                        </p>
                      )}
                    </div>
                    {stock === 0 && (
                      <span className="text-red-400 font-semibold text-sm">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm text-gray-400">
                    {item.selectedSize && (
                      <p>
                        Size: <span className="text-[var(--gold)] font-medium">{item.selectedSize}</span>
                      </p>
                    )}
                    {item.selectedWeight && (
                      <p>
                        Weight: <span className="text-[var(--gold)] font-medium">{item.selectedWeight}</span>
                      </p>
                    )}
                    {item.selectedLength && (
                      <p>
                        Length: <span className="text-[var(--gold)] font-medium">{item.selectedLength}</span>
                      </p>
                    )}
                    {item.selectedVolume && (
                      <p>
                        Volume: <span className="text-[var(--gold)] font-medium">{item.selectedVolume}</span>
                      </p>
                    )}
                    {item.selectedQuantityOption && (
                      <p>
                        Option: <span className="text-[var(--gold)] font-medium">{item.selectedQuantityOption}</span>
                      </p>
                    )}
                  </div>

                  <p className="text-[var(--gold)] text-2xl font-black mb-4">
                    {formatCurrency(item.product.price)}
                  </p>

                  <div className="flex items-center justify-between">
                    {/* QUANTITY */}
                    <div className="flex items-center gap-3 border border-[var(--border)] rounded-full px-4 py-2">
                      <button
                        onClick={() => decreaseQuantity(item.product._id || item.product.id, options)}
                        disabled={item.quantity <= 1 || cartLoading}
                        className="text-lg disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FiMinus />
                      </button>

                      <span className="font-bold text-xl min-w-[30px] text-center">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => increaseQuantity(item.product._id || item.product.id, options)}
                        disabled={(stock > 0 && item.quantity >= stock) || stock === 0 || cartLoading}
                        className="text-lg disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FiPlus />
                      </button>
                    </div>

                    {/* REMOVE */}
                    <button
                      onClick={() => removeItem(item.product._id || item.product.id, options)}
                      disabled={cartLoading}
                      className="text-red-400 hover:text-red-500 transition disabled:opacity-30"
                    >
                      <FiTrash2 size={24} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={clearCart}
            disabled={cartLoading}
            className="btn-outline disabled:opacity-50"
          >
            Clear Cart
          </button>
        </div>

        {/* RIGHT SIDE */}
        <div className="panel h-fit sticky top-36">
          <h2 className="text-3xl text-[var(--gold)] font-bold mb-8">
            Order Summary
          </h2>

          <div className="space-y-4 text-xl">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>

            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span>
            </div>

            <div className="flex justify-between">
              <span>GST</span>
              <span>{formatCurrency(tax)}</span>
            </div>

            <div className="border-t border-[var(--border)] pt-4 flex justify-between font-black text-2xl">
              <span>Total</span>
              <span className="text-[var(--gold)]">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          <button
            onClick={handleCheckoutClick}
            disabled={cartLoading}
            className="btn-gold w-full mt-8 text-xl disabled:opacity-50"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
