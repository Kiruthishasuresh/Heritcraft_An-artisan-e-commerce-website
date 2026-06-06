import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { formatCurrency } from "../utils/helpers";
import { FiCheck } from "react-icons/fi";
import { orderAPI, paymentAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const CheckoutPage = () => {
  const { cart, clearCart, increaseQuantity, decreaseQuantity } = useCart();

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const buyNowItem = location.state?.buyNowItem;

  const checkoutItems = useMemo(
    () => (buyNowItem ? [buyNowItem] : cart?.items || []),
    [buyNowItem, cart?.items]
  );

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    zip: "",
    address: "",
    city: "",
    state: "",
    payment: "Cash on Delivery",
  });

  useEffect(() => {
    if (!user) {
      navigate("/", {
        state: {
          openLogin: true,
          message: "Please log in as a buyer to check out.",
        },
        replace: true,
      });
    } else if (user.role !== "buyer") {
      const correctPath = user.role === "admin" ? "/admin" : "/seller";
      navigate(correctPath, { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const subtotal = checkoutItems.reduce(
    (acc, item) =>
      acc + Number(item.product?.price || 0) * Number(item.quantity || 0),
    0
  );

  const totalQuantity = checkoutItems.reduce(
    (acc, item) => acc + Number(item.quantity || 0),
    0
  );

  const shipping = totalQuantity >= 3 ? 0 : 50;
  const tax = Math.round(subtotal * 0.02);
  const grandTotal = subtotal + shipping + tax;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const existingScript = document.querySelector(
        `script[src="${RAZORPAY_SCRIPT_URL}"]`
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), {
          once: true,
        });
        existingScript.addEventListener("error", () => resolve(false), {
          once: true,
        });

        setTimeout(() => {
          resolve(Boolean(window.Razorpay));
        }, 500);

        return;
      }

      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT_URL;
      script.async = true;

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  const getProductId = (item) => item.product?._id || item.product?.id;

  const getProductImage = (product) => {
    return (
      product?.images?.[0] ||
      product?.media?.find((m) => m.type?.startsWith("image"))?.url ||
      product?.image ||
      "/placeholder-product.svg"
    );
  };

  const validateCheckout = () => {
    const { fullName, phone, zip, address, city, state, payment } = formData;

    if (
      !fullName.trim() ||
      !phone.trim() ||
      !zip.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !payment.trim()
    ) {
      toast.warning("Please fill all mandatory fields");
      return false;
    }

    if (!/^[0-9]{10}$/.test(phone.trim())) {
      toast.warning("Enter a valid 10-digit phone number");
      return false;
    }

    if (!checkoutItems.length) {
      toast.warning("No product selected for checkout");
      return false;
    }

    if (!user?.id || user?.role !== "buyer") {
      toast.warning("Please login as a buyer before placing order");
      return false;
    }

    const invalidProduct = checkoutItems.find((item) => !getProductId(item));

    if (invalidProduct) {
      toast.error("Invalid product found in checkout. Please refresh and try again.");
      return false;
    }

    const missingSeller = checkoutItems.find((item) => !item.product?.sellerId);

    if (missingSeller) {
      toast.error("Seller information missing for one product. Please refresh and try again.");
      return false;
    }

    if (grandTotal <= 0) {
      toast.error("Invalid order amount");
      return false;
    }

    return true;
  };

  const buildOrderItems = () => {
    return checkoutItems.map((item) => {
      const productId = getProductId(item);

      return {
        productId,
        productName: item.product?.name || "Product",
        image: getProductImage(item.product),
        quantity: Number(item.quantity || 1),
        price: Number(item.product?.price || 0),

        selectedSize: item.selectedSize || "",
        selectedWeight: item.selectedWeight || "",
        selectedLength: item.selectedLength || "",
        selectedVolume: item.selectedVolume || "",
        selectedQuantityOption: item.selectedQuantityOption || "",

        sellerId: item.product?.sellerId,
        sellerName: item.product?.sellerName || "Seller",
        sellerShopName:
          item.product?.sellerShopName ||
          item.product?.seller?.shopName ||
          "HeritCraft Seller",
      };
    });
  };

  const buildOrderRequestPayload = () => {
    const orderItems = buildOrderItems();

    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,

      items: orderItems,

      subtotal,
      shipping,
      tax,
      totalAmount: grandTotal,

      paymentMethod:
        formData.payment === "Cash on Delivery"
          ? "Cash on Delivery"
          : "RAZORPAY",

      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      zip: formData.zip.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
    };
  };

  const handleCodOrder = async (orderRequestPayload) => {
    await orderAPI.create(orderRequestPayload);

    if (!buyNowItem) {
      await clearCart();
    }

    toast.success("Order placed successfully");
    setSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRazorpayOrder = async (orderRequestPayload) => {
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded || !window.Razorpay) {
      toast.error("Payment gateway failed to load. Please try again.");
      setLoading(false);
      return;
    }

    const orderRes = await paymentAPI.createOrder({
      amount: grandTotal,
      currency: "INR",
      receipt: `heritcraft_receipt_${Date.now()}`,
      orderRequest: orderRequestPayload,
    });

    const { keyId, razorpayOrderId, amount, currency } = orderRes.data || {};

    if (!keyId || !razorpayOrderId || !amount || !currency) {
      toast.error("Invalid payment order response. Please try again.");
      setLoading(false);
      return;
    }

    const options = {
      key: keyId,
      amount,
      currency,
      name: "HeritCraft",
      description: "HeritCraft Order Payment",
      order_id: razorpayOrderId,

      handler: async function (response) {
        try {
          if (
            !response?.razorpay_order_id ||
            !response?.razorpay_payment_id ||
            !response?.razorpay_signature
          ) {
            toast.error("Invalid payment response. Please contact support.");
            setLoading(false);
            return;
          }

          await paymentAPI.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderRequest: orderRequestPayload,
          });

          if (!buyNowItem) {
            await clearCart();
          }

          toast.success("Payment successful. Order placed successfully.");
          setSuccess(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
          console.error("Payment verification failed:", error);
          toast.error(
            error.response?.data?.message ||
              "Payment verification failed. Please contact support."
          );
          setLoading(false);
        }
      },

      prefill: {
        name: formData.fullName.trim() || user?.name || "",
        email: user?.email || "",
        contact: formData.phone.trim() || "",
      },

      theme: {
        color: "#d4af37",
      },

      modal: {
        ondismiss: function () {
          toast.info("Payment cancelled. Your cart is still saved.");
          setLoading(false);
        },
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on("payment.failed", function (response) {
      console.error("Payment failed:", response.error);
      toast.error(
        response.error?.description || "Payment failed. Please try again."
      );
      setLoading(false);
    });

    razorpay.open();
  };

  const placeOrder = async () => {
    if (loading) return;

    if (!validateCheckout()) return;

    setLoading(true);

    try {
      const orderRequestPayload = buildOrderRequestPayload();

      if (formData.payment === "Cash on Delivery") {
        await handleCodOrder(orderRequestPayload);
      } else {
        await handleRazorpayOrder(orderRequestPayload);
      }
    } catch (error) {
      console.error("Failed to place order:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to place order. Please try again."
      );
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-wrap text-center animate-fadeIn">
        <div className="max-w-2xl mx-auto panel py-20">
          <div className="w-24 h-24 rounded-full bg-[var(--gold)] text-black flex items-center justify-center mx-auto mb-8">
            <FiCheck size={48} />
          </div>

          <h1 className="section-title mb-6">Order Placed Successfully!</h1>

          <p className="section-subtitle mb-10">
            Your handcrafted heritage products are on the way.
          </p>

          <div className="flex justify-center gap-5 flex-wrap">
            <button
              onClick={() => navigate("/buyer?tab=orders")}
              className="btn-gold"
            >
              View Orders
            </button>

            <button
              onClick={() => navigate("/products")}
              className="btn-outline"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap animate-fadeIn">
      <h1 className="section-title mb-10">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 panel">
          <h2 className="text-3xl text-[var(--gold)] font-bold mb-6">
            Shipping Address
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input
              className="input-gold md:col-span-2"
              placeholder="Full Name *"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            <input
              className="input-gold"
              placeholder="Phone Number *"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <input
              className="input-gold"
              placeholder="Zip Code *"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              required
            />

            <input
              className="input-gold md:col-span-2"
              placeholder="Street Address *"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />

            <input
              className="input-gold"
              placeholder="City *"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
            />

            <input
              className="input-gold"
              placeholder="State *"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
            />
          </div>

          <h2 className="text-3xl text-[var(--gold)] font-bold mt-10 mb-6">
            Payment Method
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["Cash on Delivery", "Online Payment (Razorpay)"].map(
              (method) => (
                <label
                  key={method}
                  className="panel flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method}
                    checked={formData.payment === method}
                    onChange={handleChange}
                  />

                  {method}
                </label>
              )
            )}
          </div>
        </div>

        <div className="panel h-fit sticky top-36">
          <h2 className="text-3xl text-[var(--gold)] font-bold mb-6">
            Order Summary
          </h2>

          <div className="space-y-4 mb-6">
            {checkoutItems.map((item) => {
              const productId = getProductId(item);

              const itemKey = `${productId}-${item.selectedSize || ""}-${
                item.selectedWeight || ""
              }-${item.selectedLength || ""}-${item.selectedVolume || ""}-${
                item.selectedQuantityOption || ""
              }`;

              const itemImgSrc = getProductImage(item.product);

              return (
                <div
                  key={itemKey}
                  className="flex gap-4 border-b border-[var(--border)] pb-4"
                >
                  <img
                    src={itemImgSrc}
                    alt={item.product?.name || "Product"}
                    className="w-20 h-20 object-cover rounded-xl"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-product.svg";
                    }}
                  />

                  <div className="flex-1">
                    <p className="font-semibold text-white">
                      {item.product?.name}
                    </p>

                    {item.selectedSize && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Size:{" "}
                        <span className="text-[var(--gold)]">
                          {item.selectedSize}
                        </span>
                      </p>
                    )}

                    {item.selectedWeight && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Weight:{" "}
                        <span className="text-[var(--gold)]">
                          {item.selectedWeight}
                        </span>
                      </p>
                    )}

                    {item.selectedLength && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Length:{" "}
                        <span className="text-[var(--gold)]">
                          {item.selectedLength}
                        </span>
                      </p>
                    )}

                    {item.selectedVolume && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Volume:{" "}
                        <span className="text-[var(--gold)]">
                          {item.selectedVolume}
                        </span>
                      </p>
                    )}

                    {item.selectedQuantityOption && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Quantity Option:{" "}
                        <span className="text-[var(--gold)]">
                          {item.selectedQuantityOption}
                        </span>
                      </p>
                    )}

                    <p className="text-[var(--gold)] font-bold mt-1">
                      {formatCurrency(item.product?.price || 0)}
                    </p>

                    {!buyNowItem && (
                      <div className="flex items-center gap-3 mt-3">
                        <button
                          className="qty-btn"
                          disabled={loading}
                          onClick={() =>
                            decreaseQuantity(
                              productId,
                              item.selectedSize,
                              item.selectedWeight,
                              item.selectedLength,
                              item.selectedVolume,
                              item.selectedQuantityOption
                            )
                          }
                        >
                          -
                        </button>

                        <span className="font-bold text-lg">
                          {item.quantity}
                        </span>

                        <button
                          className="qty-btn"
                          disabled={loading}
                          onClick={() =>
                            increaseQuantity(
                              productId,
                              item.selectedSize,
                              item.selectedWeight,
                              item.selectedLength,
                              item.selectedVolume,
                              item.selectedQuantityOption
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    )}

                    {buyNowItem && (
                      <p className="text-gray-400 text-sm mt-2">
                        Quantity: {item.quantity}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Total</p>

                    <p className="text-[var(--gold)] font-bold text-lg">
                      {formatCurrency(
                        Number(item.product?.price || 0) *
                          Number(item.quantity || 0)
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[var(--border)] pt-5 space-y-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span>
            </div>

            <div className="flex justify-between">
              <span>GST</span>
              <span>{formatCurrency(tax)}</span>
            </div>

            <div className="flex justify-between text-2xl font-black">
              <span>Total</span>
              <span className="text-[var(--gold)]">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          <button
            onClick={placeOrder}
            disabled={loading}
            className="btn-gold w-full mt-8 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? formData.payment === "Cash on Delivery"
                ? "Placing Order..."
                : "Processing Payment..."
              : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;