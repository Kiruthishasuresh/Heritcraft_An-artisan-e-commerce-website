import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { orderAPI, reviewAPI, userAPI } from "../services/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import ReviewForm from "../components/reviews/ReviewForm";
import ConfirmModal from "../components/common/ConfirmModal";
import { FiGrid, FiShoppingBag, FiUser, FiStar, FiMapPin, FiPhone, FiMail, FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiHeart, FiSettings, FiTrash2, FiEdit2 } from "react-icons/fi";

const STATUS_COLORS = {
  PLACED: { bg: "#fef3c7", color: "#92400e" }, PACKED: { bg: "#dbeafe", color: "#1e40af" },
  SHIPPED: { bg: "#e0e7ff", color: "#3730a3" }, OUT_FOR_DELIVERY: { bg: "#ede9fe", color: "#5b21b6" },
  DELIVERED: { bg: "#dcfce7", color: "#166534" }, CANCELLED: { bg: "#fee2e2", color: "#991b1b" },
  PAID: { bg: "#dcfce7", color: "#166534" }, PENDING: { bg: "#fef3c7", color: "#92400e" },
  REFUNDED: { bg: "#fee2e2", color: "#991b1b" }, COD_PENDING: { bg: "#ffedd5", color: "#9a3412" },
};
const StatusBadge = ({ status }) => {
  const s = (status || "").toUpperCase().replace(/ /g, "_");
  const c = STATUS_COLORS[s] || { bg: "#333", color: "#ccc" };
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>{s.replace(/_/g, " ")}</span>;
};

const RefundStatusBadge = ({ status }) => {
  const s = status || "REQUESTED";
  let bg = "rgba(245, 158, 11, 0.15)", color = "#f59e0b", border = "1px solid rgba(245, 158, 11, 0.3)", text = "Refund Requested";
  if (s === "APPROVED") {
    bg = "rgba(34, 197, 94, 0.15)"; color = "#22c55e"; border = "1px solid rgba(34, 197, 94, 0.3)"; text = "Refund Approved";
  } else if (s === "REJECTED") {
    bg = "rgba(239, 68, 68, 0.15)"; color = "#ef4444"; border = "1px solid rgba(239, 68, 68, 0.3)"; text = "Refund Rejected";
  } else if (s === "PROCESSED") {
    bg = "rgba(59, 130, 246, 0.15)"; color = "#3b82f6"; border = "1px solid rgba(59, 130, 246, 0.3)"; text = "Refund Processed";
  }
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color: color, border: border, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
};

const STATUS_STEPS = ["PLACED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
const STEP_ICONS = [FiPackage, FiPackage, FiTruck, FiTruck, FiCheckCircle];

const BuyerDashboard = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { addToCart } = useCart();
  const { wishlistItems, wishlistCount, removeFromWishlist, clearWishlist, moveToCart } = useWishlist();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [buyerReviews, setBuyerReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundFormOrderId, setRefundFormOrderId] = useState("");
  const [refundFormReason, setRefundFormReason] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
 
  const [isEditing, setIsEditing] = useState(false);
  const [searchParams] = useSearchParams();
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(null);

  // Return Feature State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturnItem, setSelectedReturnItem] = useState(null);
  const [returnForm, setReturnForm] = useState({ reason: "", customReason: "" });
  const RETURN_REASONS = [
    "Defective or Damaged",
    "Item not as described",
    "Received wrong item",
    "Changed my mind",
    "Other"
  ];

  // Read ?tab=profile from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  const tabs = [
    { key: "dashboard", label: "Overview", icon: <FiGrid /> },
    { key: "orders", label: "Orders", icon: <FiShoppingBag /> },
    { key: "wishlist", label: "Wishlist", icon: <FiHeart /> },
    { key: "profile", label: "Profile", icon: <FiUser /> },
    { key: "settings", label: "Settings", icon: <FiSettings /> },
  ];

  const loadOverviewData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [orderRes, reviewRes] = await Promise.all([
        orderAPI.getByUser(user.id).catch(() => ({ data: [] })),
        reviewAPI.getByBuyer(user.id).catch(() => ({ data: [] }))
      ]);
      setOrders(orderRes.data || []);
      setBuyerReviews(reviewRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadOrdersData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await orderAPI.getByUser(user.id).catch(() => ({ data: [] }));
      setOrders(res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (user) setProfileForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      zip: user.zip || "",
      profileImage: user.profileImage || ""
    });
  }, [user]);

  

  useEffect(() => {
    if (!user?.id) return;
    if (activeTab === "dashboard") loadOverviewData();
    else if (activeTab === "orders") loadOrdersData();
  }, [user?.id, activeTab]);

  const performCancel = async () => {
    if (!confirmCancelOrder) return;
    try {
      await orderAPI.cancelOrder(confirmCancelOrder);
      toast.success("Order cancelled and refunded");
      if (activeTab === "orders") loadOrdersData();
      else loadOverviewData();
      setSelectedOrder(null);
    } catch (e) { toast.error(e.response?.data?.message || "Cancel failed"); }
    finally { setConfirmCancelOrder(null); }
  };

  const handleRequestReturn = async () => {
    if (!returnForm.reason) {
      toast.error("Please select a return reason");
      return;
    }
    try {
      await orderAPI.requestReturn(selectedOrder.id, selectedReturnItem.productId, {
        reason: returnForm.reason,
        customReason: returnForm.customReason
      });
      toast.success("Return requested successfully");
      setShowReturnModal(false);
      setSelectedReturnItem(null);
      setReturnForm({ reason: "", customReason: "" });
      if (activeTab === "orders") loadOrdersData();
      else loadOverviewData();
      
      // Refresh the currently selected order to show new item status
      const updatedOrder = await orderAPI.getByUser(user.id).then(res => res.data.find(o => o.id === selectedOrder.id));
      if (updatedOrder) setSelectedOrder(updatedOrder);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to request return");
    }
  };

  const handleRequestRefund = async (e) => {
    e.preventDefault();
    if (!refundFormReason.trim()) {
      toast.error("Please enter a reason for the refund");
      return;
    }
    setSubmittingRefund(true);
    try {
      await orderAPI.requestRefund(refundFormOrderId, { reason: refundFormReason });
      toast.success("Refund request submitted");
      setShowRefundModal(false);
      
      // Refresh the currently selected order to show new refund status
      const updatedOrder = await orderAPI.getByUser(user.id).then(res => res.data.find(o => o.id === selectedOrder.id));
      if (updatedOrder) setSelectedOrder(updatedOrder);
      
      if (activeTab === "orders") loadOrdersData();
      else loadOverviewData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Refund request failed");
    } finally {
      setSubmittingRefund(false);
    }
  };

  // deleted handleReview local function since ReviewForm manages submission

  const handleProfileSave = async () => {
    try {
      const res = await userAPI.updateProfile(user.id, profileForm);
      updateUser(res.data);
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (e) { toast.error(e.response?.data?.message || "Update failed"); }
  };

  const handleProfileCancel = () => {
    setProfileForm({
      name: user.name || "", email: user.email || "", phone: user.phone || "",
      address: user.address || "", city: user.city || "", state: user.state || "",
      zip: user.zip || "", profileImage: user.profileImage || ""
    });
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }
    try {
      const { initEncryption, encryptPassword } = await import("../utils/encryption");
      const { authAPI } = await import("../services/api");
      
      await initEncryption(authAPI.getPublicKey);
      
      const encCurrent = encryptPassword(passwordForm.currentPassword);
      const encNew = encryptPassword(passwordForm.newPassword);
      const encConfirm = encryptPassword(passwordForm.confirmPassword);

      await userAPI.changePassword(user.id, {
        currentPassword: encCurrent,
        newPassword: encNew,
        confirmPassword: encConfirm
      });
      toast.success("Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      toast.error(e.response?.data?.message || "Password update failed");
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  const delivered = orders.filter(o => o.orderStatus === "DELIVERED").length;
  const inTransit = orders.filter(o => ["SHIPPED", "OUT_FOR_DELIVERY", "PACKED"].includes(o.orderStatus)).length;
  const cancelled = orders.filter(o => o.orderStatus === "CANCELLED").length;
  const processing = orders.filter(o => o.orderStatus === "PLACED").length;

  const cardStyle = (bc) => ({ background: "#141414", borderRadius: 16, padding: "22px 24px", borderLeft: `4px solid ${bc}`, borderTop: "1px solid rgba(212,175,55,0.10)", borderRight: "1px solid rgba(212,175,55,0.10)", borderBottom: "1px solid rgba(212,175,55,0.10)" });

  if (loading) return (
    <DashboardLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {/* DASHBOARD */}
      {activeTab === "dashboard" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 24 }}>My Dashboard</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total Orders", value: orders.length, color: "#3b82f6" },
              { label: "Delivered", value: delivered, color: "#22c55e" },
              { label: "In Transit", value: inTransit, color: "#8b5cf6" },
              { label: "Processing", value: processing, color: "#f59e0b" },
              { label: "Cancelled", value: cancelled, color: "#ef4444" },
            ].map((c, i) => (
              <div key={i} style={cardStyle(c.color)}>
                <p style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>{c.label}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{c.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <button onClick={() => navigate("/products")} className="btn-gold" style={{ padding: "12px 24px" }}>Browse Products</button>
            <button onClick={() => navigate("/cart")} style={{ padding: "12px 24px", background: "#141414", border: "1px solid #333", borderRadius: 8, color: "#ddd", cursor: "pointer" }}>View Cart</button>
          </div>

          {orders.length > 0 && (
            <div style={{ ...cardStyle("#d4af37"), borderLeft: "none" }}>
              <h3 style={{ color: "var(--gold)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent Orders</h3>
              {orders.slice(0, 5).map(o => (
                <div key={o.id} onClick={() => setSelectedOrder(o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <p style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>{o.items?.[0]?.productName || "Order"}{o.items?.length > 1 ? ` +${o.items.length - 1} more` : ""}</p>
                    <p style={{ color: "#888", fontSize: 12 }}>{formatDate(o.createdAt)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: "#fff", fontWeight: 600 }}>{formatCurrency(o.totalAmount)}</p>
                    <StatusBadge status={o.orderStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS */}
      {activeTab === "orders" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 20 }}>My Orders</h2>
          {orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
              <FiShoppingBag size={48} style={{ margin: "0 auto 16px", display: "block" }} />
              <p>No orders yet</p>
              <button onClick={() => navigate("/products")} className="btn-gold" style={{ marginTop: 16, padding: "10px 24px" }}>Start Shopping</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {orders.map(o => (
                <div key={o.id} style={{ background: "#141414", borderRadius: 16, padding: 20, border: "1px solid rgba(212,175,55,0.10)", cursor: "pointer" }}
                  onClick={() => setSelectedOrder(o)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <p style={{ color: "#999", fontSize: 11 }}>ORDER #{o.id?.slice(-8)}</p>
                      <p style={{ color: "#fff", fontWeight: 600, marginTop: 4 }}>{formatCurrency(o.totalAmount)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <StatusBadge status={o.orderStatus} />
                      <p style={{ color: "#888", fontSize: 11, marginTop: 4 }}>{formatDate(o.createdAt)}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {o.items?.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0d0d0d", borderRadius: 8, padding: "6px 10px" }}>
                        {item.image && <img src={item.image} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />}
                        <span style={{ color: "#ccc", fontSize: 12 }}>{item.productName} x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                    <StatusBadge status={o.paymentStatus} />
                    {o.refundRequested && <RefundStatusBadge status={o.refundStatus} />}
                    <span style={{ color: "#888", fontSize: 12 }}>{o.paymentMethod}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WISHLIST */}
      {activeTab === "wishlist" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", margin: 0 }}>My Wishlist <span style={{ fontSize: 14, color: "#888", fontWeight: 400 }}>({wishlistCount})</span></h2>
            {wishlistCount > 0 && (
              <button onClick={() => { if (window.confirm("Clear entire wishlist?")) clearWishlist(); }} style={{ padding: "8px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#ef4444", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                Clear All
              </button>
            )}
          </div>

          {wishlistCount === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
              <FiHeart size={48} style={{ margin: "0 auto 16px", display: "block" }} />
              <p>Your wishlist is empty</p>
              <button onClick={() => navigate("/products")} className="btn-gold" style={{ marginTop: 16, padding: "10px 24px" }}>Browse Products</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {wishlistItems.map((item) => {
                const productId = item.productId;
                const inStock = item.stock > 0;
                return (
                  <div key={productId} style={{ background: "#141414", borderRadius: 16, border: "1px solid rgba(212,175,55,0.10)", padding: 16, display: "flex", gap: 14 }}>
                    <div
                      style={{ width: 90, height: 90, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#0d0d0d", cursor: "pointer" }}
                      onClick={() => navigate(`/products/${productId}`)}
                    >
                      <img src={item.image || "/placeholder-product.svg"} alt={item.productName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.src = "/placeholder-product.svg"; }} />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <p style={{ color: "#fff", fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }} onClick={() => navigate(`/products/${productId}`)}>{item.productName}</p>
                      <p style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>{item.sellerShopName || item.sellerName || "HeritCraft Seller"}</p>
                      <p style={{ color: "var(--gold)", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{formatCurrency(item.price)}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: inStock ? "#22c55e" : "#ef4444", marginBottom: 8 }}>{inStock ? "In Stock" : "Out of Stock"}</p>
                      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                        <button
                          onClick={() => moveToCart(item, navigate)}
                          disabled={!inStock}
                          style={{ flex: 1, padding: "6px 12px", background: inStock ? "linear-gradient(135deg,#d4af37,#b8860b)" : "#333", border: "none", borderRadius: 999, color: inStock ? "#000" : "#666", fontWeight: 600, fontSize: 11, cursor: inStock ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                        >
                          Move to Cart
                        </button>
                        <button
                          onClick={() => removeFromWishlist(productId)}
                          style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 999, color: "#ef4444", fontWeight: 600, fontSize: 11, cursor: "pointer" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PROFILE */}
      {activeTab === "profile" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", margin: 0 }}>My Profile</h2>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="btn-gold" style={{ padding: "8px 24px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <FiEdit2 size={14} /> Edit Profile
              </button>
            )}
          </div>

          {/* Profile Card */}
          <div style={{ background: "#141414", borderRadius: 16, padding: 28, border: "1px solid rgba(212,175,55,0.10)", maxWidth: 700, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  {profileForm.profileImage ? (
                    <img src={profileForm.profileImage} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)" }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#d4af37,#b8860b)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", fontSize: 30 }}>
                      {(profileForm.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <input value={profileForm.profileImage || ""} onChange={e => setProfileForm({ ...profileForm, profileImage: e.target.value })} className="input-gold" placeholder="Profile image URL" style={{ fontSize: 12, width: 220 }} />
                </div>
              ) : (
                <>
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)" }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#d4af37,#b8860b)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", fontSize: 30 }}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </>
              )}
              <div>
                <p style={{ color: "#fff", fontSize: 20, fontWeight: 600 }}>{user?.name}</p>
                <p style={{ color: "#888", fontSize: 13 }}><FiMail size={12} style={{ marginRight: 4 }} />{user?.email}</p>
                <span style={{ display: "inline-block", marginTop: 6, padding: "3px 12px", borderRadius: 20, background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700 }}>Buyer</span>
              </div>
            </div>

            {/* Personal Information */}
            <h3 style={{ color: "var(--gold)", fontSize: 14, fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>Personal Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div className="field">
                <label>Full Name</label>
                {isEditing ? <input value={profileForm.name || ""} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="input-gold" /> : <p style={{ color: "#ddd", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222" }}>{user?.name || "-"}</p>}
              </div>
              <div className="field">
                <label>Email Address</label>
                <p style={{ color: "#999", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222" }}>{user?.email || "-"}</p>
              </div>
              <div className="field">
                <label><FiPhone size={12} style={{ marginRight: 4 }} />Phone</label>
                {isEditing ? <input value={profileForm.phone || ""} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className="input-gold" placeholder="Phone number" /> : <p style={{ color: "#ddd", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222" }}>{user?.phone || "-"}</p>}
              </div>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <label><FiMapPin size={12} style={{ marginRight: 4 }} />Address</label>
                {isEditing ? <input value={profileForm.address || ""} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} className="input-gold" placeholder="Street address" /> : <p style={{ color: "#ddd", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222" }}>{user?.address || "-"}</p>}
              </div>
              <div className="field">
                <label>City</label>
                {isEditing ? <input value={profileForm.city || ""} onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} className="input-gold" placeholder="City" /> : <p style={{ color: "#ddd", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222" }}>{user?.city || "-"}</p>}
              </div>
              <div className="field">
                <label>State</label>
                {isEditing ? <input value={profileForm.state || ""} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} className="input-gold" placeholder="State" /> : <p style={{ color: "#ddd", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222" }}>{user?.state || "-"}</p>}
              </div>
              <div className="field">
                <label>ZIP Code</label>
                {isEditing ? <input value={profileForm.zip || ""} onChange={e => setProfileForm({ ...profileForm, zip: e.target.value })} className="input-gold" placeholder="ZIP" /> : <p style={{ color: "#ddd", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222" }}>{user?.zip || "-"}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleProfileSave} className="btn-gold" style={{ padding: "12px 32px" }}>Save Changes</button>
                <button onClick={handleProfileCancel} style={{ padding: "12px 32px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#999", cursor: "pointer" }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === "settings" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 24 }}>Account Settings</h2>

          {/* Change Password */}
          <div style={{ background: "#141414", borderRadius: 16, padding: 28, border: "1px solid rgba(212,175,55,0.10)", maxWidth: 500, marginBottom: 24 }}>
            <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Change Password</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field">
                <label>Current Password</label>
                <input type="password" value={passwordForm.currentPassword || ""} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="input-gold" placeholder="Enter current password" />
              </div>
              <div className="field">
                <label>New Password</label>
                <input type="password" value={passwordForm.newPassword || ""} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="input-gold" placeholder="Enter new password" />
              </div>
              <div className="field">
                <label>Confirm New Password</label>
                <input type="password" value={passwordForm.confirmPassword || ""} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="input-gold" placeholder="Confirm new password" />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={handleChangePassword} className="btn-gold" style={{ padding: "12px 32px" }}>Update Password</button>
                <button onClick={() => setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })} style={{ padding: "12px 32px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#999", cursor: "pointer" }}>Clear</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", overflowY: "auto" }}
          onClick={() => setSelectedOrder(null)}>
          <div style={{ background: "#111", borderRadius: 20, border: "1px solid rgba(212,175,55,0.2)", maxWidth: 650, width: "100%", padding: 32 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", color: "var(--gold)" }}>Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 24 }}>&times;</button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <p style={{ color: "#888", fontSize: 12 }}>Order ID</p>
                <p style={{ color: "#fff", fontWeight: 600 }}>#{selectedOrder.id?.slice(-8)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#888", fontSize: 12 }}>Total</p>
                <p style={{ color: "var(--gold)", fontWeight: 700, fontSize: 20 }}>{formatCurrency(selectedOrder.totalAmount)}</p>
              </div>
            </div>

            {/* Timeline */}
            {selectedOrder.orderStatus !== "CANCELLED" && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ color: "#999", fontSize: 12, marginBottom: 12 }}>Order Tracking</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                  <div style={{ position: "absolute", top: 16, left: 20, right: 20, height: 2, background: "#333", zIndex: 0 }} />
                  {STATUS_STEPS.map((step, i) => {
                    const currentIdx = STATUS_STEPS.indexOf(selectedOrder.orderStatus);
                    const done = i <= currentIdx;
                    const Icon = STEP_ICONS[i];
                    return (
                      <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, flex: 1 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: done ? "#d4af37" : "#333", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                          <Icon size={14} color={done ? "#000" : "#666"} />
                        </div>
                        <span style={{ fontSize: 9, color: done ? "#d4af37" : "#666", textAlign: "center", maxWidth: 70 }}>{step.replace(/_/g, " ")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedOrder.orderStatus === "CANCELLED" && (
              <div style={{ background: "rgba(239,68,68,0.1)", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <FiXCircle size={20} color="#ef4444" />
                <span style={{ color: "#ef4444", fontWeight: 600 }}>Order Cancelled — Payment Refunded</span>
              </div>
            )}

            {/* Items */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>Items</p>
              {selectedOrder.items?.map((item, idx) => {
                const isReviewed = selectedOrder.orderStatus === "DELIVERED" && buyerReviews.some(
                  (r) => r.productId === item.productId && r.orderId === selectedOrder.id
                );

                return (
                <div key={idx} style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: 12, marginBottom: 12 }}>
                  {/* Item row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                    {item.image && <img src={item.image} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />}
                    <div style={{ flex: 1 }}>
                      <p style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>{item.productName}</p>
                      <p style={{ color: "#888", fontSize: 12 }}>Qty: {item.quantity} {item.selectedSize && `| Size: ${item.selectedSize}`} {item.selectedWeight && `| Weight: ${item.selectedWeight}`}</p>
                    
                      {/* Return Status Badge */}
                      {item.returnStatus && (
                         <div style={{ marginTop: 6 }}>
                           <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, 
                              background: item.returnStatus === "RETURN_REQUESTED" ? "rgba(245,158,11,0.15)" : item.returnStatus === "RETURN_APPROVED" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                              color: item.returnStatus === "RETURN_REQUESTED" ? "#f59e0b" : item.returnStatus === "RETURN_APPROVED" ? "#22c55e" : "#ef4444" }}>
                             {item.returnStatus.replace(/_/g, " ")}
                           </span>
                         </div>
                      )}
                    </div>
                    <p style={{ color: "#d4af37", fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</p>
                  </div>

                  {/* Review Action Section — professional layout */}
                  {selectedOrder.orderStatus === "DELIVERED" && (
                    <div style={{
                      marginTop: 8,
                      background: isReviewed ? "rgba(34,197,94,0.05)" : "rgba(212,175,55,0.04)",
                      border: isReviewed ? "1px solid rgba(34,197,94,0.15)" : "1px solid rgba(212,175,55,0.12)",
                      borderRadius: 12, padding: "14px 16px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 16,
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: isReviewed ? "#22c55e" : "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                          {isReviewed ? "Thank you for your review!" : "Share your experience with this product"}
                        </p>
                        <p style={{ color: "#777", fontSize: 11, margin: 0 }}>
                          {isReviewed ? "Your feedback helps other buyers" : "Help other buyers make better decisions"}
                        </p>
                      </div>
                      {isReviewed ? (
                        <span style={{
                          display: "flex", alignItems: "center", gap: 6,
                          color: "#22c55e", fontSize: 13, fontWeight: 600,
                          padding: "8px 18px", background: "rgba(34,197,94,0.1)",
                          borderRadius: 999, whiteSpace: "nowrap",
                          border: "1px solid rgba(34,197,94,0.2)",
                        }}>
                          <FiCheckCircle size={15} /> Reviewed
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!selectedOrder || !item) {
                              toast.error("Unable to load review details. Please try again.");
                              return;
                            }
                            setSelectedReviewOrder(selectedOrder);
                            setSelectedReviewItem(item);
                            setShowReviewModal(true);
                          }}
                          style={{
                            background: "transparent",
                            border: "2px solid #d4af37",
                            borderRadius: 999,
                            padding: "10px 24px",
                            cursor: "pointer",
                            color: "#d4af37",
                            fontSize: 14,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            whiteSpace: "nowrap",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,175,55,0.12)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
                        >
                          <FiStar size={16} /> Write a Review
                        </button>
                      )}
                    </div>
                  )}

                  {/* Return button for delivered orders without active return request */}
                  {selectedOrder.orderStatus === "DELIVERED" && !item.returnStatus && (
                    (() => {
                      let isReturnable = true;
                      if (selectedOrder.deliveredAt) {
                        const diffTime = Math.abs(new Date() - new Date(selectedOrder.deliveredAt));
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        if (diffDays > 7) isReturnable = false;
                      }
                      
                      return isReturnable ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start", marginTop: 8 }}>
                          <p style={{ color: "#aaa", fontSize: 11, margin: 0 }}>Return Window: Max 7-10 days from delivery</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReturnItem(item);
                              setShowReturnModal(true);
                            }}
                            style={{
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              borderRadius: 8,
                              padding: "8px 16px",
                              cursor: "pointer",
                              color: "#ef4444",
                              fontSize: 12,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 6
                            }}
                          >
                            Request Return
                          </button>
                        </div>
                      ) : (
                        <span style={{ display: "inline-block", marginTop: 8, color: "#ef4444", fontSize: 10, fontWeight: 600, padding: "4px 8px", background: "rgba(239,68,68,0.1)", borderRadius: 6 }}>
                          Return Window Closed
                        </span>
                      );
                    })()
                  )}
                </div>
                );
              })}
            </div>

            {/* Shipping */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>Shipping Address</p>
              <div style={{ background: "#0d0d0d", borderRadius: 10, padding: 14 }}>
                <p style={{ color: "#fff", fontWeight: 500 }}>{selectedOrder.fullName}</p>
                <p style={{ color: "#888", fontSize: 13 }}><FiPhone size={11} /> {selectedOrder.phone}</p>
                <p style={{ color: "#888", fontSize: 13 }}><FiMapPin size={11} /> {selectedOrder.address}, {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.zip}</p>
              </div>
            </div>

            {/* Payment Info */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>Payment Details</p>
              <div style={{ background: "#0d0d0d", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <StatusBadge status={selectedOrder.paymentStatus} />
                  {selectedOrder.refundRequested && <RefundStatusBadge status={selectedOrder.refundStatus} />}
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{selectedOrder.paymentMethod}</span>
                </div>
                {selectedOrder.paymentProvider && (
                  <p style={{ color: "#888", fontSize: 12, margin: 0 }}>
                    Provider: <span style={{ color: "#fff" }}>{selectedOrder.paymentProvider}</span>
                  </p>
                )}
                {selectedOrder.transactionId && (
                  <p style={{ color: "#888", fontSize: 12, margin: 0 }}>
                    Transaction ID: <span style={{ color: "#fff", fontFamily: "monospace" }}>{selectedOrder.transactionId}</span>
                  </p>
                )}
                {selectedOrder.paidAt && (
                  <p style={{ color: "#888", fontSize: 12, margin: 0 }}>
                    Paid At: <span style={{ color: "#fff" }}>{formatDate(selectedOrder.paidAt)}</span>
                  </p>
                )}
              </div>
            </div>

            {selectedOrder.refundRequested && selectedOrder.refundReason && (
              <div style={{ background: "#0d0d0d", borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <p style={{ color: "#bbb", fontSize: 12, marginBottom: 4 }}>Refund Reason:</p>
                <p style={{ color: "#fff", fontSize: 13, margin: 0, fontStyle: "italic" }}>"{selectedOrder.refundReason}"</p>
                {selectedOrder.refundRequestedAt && (
                  <p style={{ color: "#666", fontSize: 11, marginTop: 8, marginBottom: 0 }}>
                    Requested on: {formatDate(selectedOrder.refundRequestedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Cancel button — only for PLACED orders */}
            {selectedOrder.orderStatus === "PLACED" && (
              <button onClick={() => setConfirmCancelOrder(selectedOrder.id)} style={{ width: "100%", padding: "12px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#ef4444", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                Cancel Order
              </button>
            )}

            {/* Refund button — not cancelled, not requested yet */}
            {!selectedOrder.refundRequested && selectedOrder.orderStatus !== "CANCELLED" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRefundFormOrderId(selectedOrder.id);
                  setRefundFormReason("");
                  setShowRefundModal(true);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(212,175,55,0.15)",
                  border: "1px solid rgba(212,175,55,0.3)",
                  borderRadius: 10,
                  color: "var(--gold)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 14,
                  marginTop: selectedOrder.orderStatus === "PLACED" ? 12 : 0,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,175,55,0.25)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(212,175,55,0.15)"; }}
              >
                Request Refund
              </button>
            )}
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {showReviewModal && selectedReviewOrder && selectedReviewItem && (
        <ReviewForm
          order={selectedReviewOrder}
          item={selectedReviewItem}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedReviewOrder(null);
            setSelectedReviewItem(null);
          }}
          onSuccess={() => {
            loadBuyerReviews();
            loadOrders();
          }}
        />
      )}

      {/* RETURN MODAL */}
      {showReturnModal && selectedReturnItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 110, display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <div style={{ background: "#111", borderRadius: 16, border: "1px solid #333", maxWidth: 450, width: "100%", padding: 24 }}>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Request Return</h3>
            <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Item: <strong style={{ color: "#ccc" }}>{selectedReturnItem.productName}</strong></p>
            
            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ color: "#bbb", fontSize: 12, marginBottom: 6, display: "block" }}>Reason for Return *</label>
              <select 
                value={returnForm.reason} 
                onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                className="input-gold" 
                style={{ width: "100%", padding: "10px 12px" }}
              >
                <option value="">Select a reason</option>
                {RETURN_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            
            <div className="field" style={{ marginBottom: 24 }}>
              <label style={{ color: "#bbb", fontSize: 12, marginBottom: 6, display: "block" }}>Additional Details (Optional)</label>
              <textarea 
                value={returnForm.customReason} 
                onChange={(e) => setReturnForm({ ...returnForm, customReason: e.target.value })}
                className="input-gold" 
                rows={3}
                placeholder="Explain the issue in more detail..."
                style={{ width: "100%", padding: "10px 12px", resize: "none" }}
              />
            </div>
            
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button 
                onClick={() => { setShowReturnModal(false); setSelectedReturnItem(null); setReturnForm({ reason: "", customReason: "" }); }}
                style={{ padding: "10px 20px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#999", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button onClick={handleRequestReturn} className="btn-gold" style={{ padding: "10px 20px" }}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmCancelOrder}
        title="Cancel Order"
        message="Cancel this order? Stock will be restored and payment refunded."
        confirmText="Cancel Order"
        cancelText="Keep Order"
        type="danger"
        onConfirm={performCancel}
        onCancel={() => setConfirmCancelOrder(null)}
      />

      {/* REFUND REQUEST MODAL */}
      {showRefundModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 110, display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }} onClick={() => { setShowRefundModal(false); setRefundFormOrderId(""); setRefundFormReason(""); }}>
          <div style={{ background: "#111", borderRadius: 16, border: "1px solid #333", maxWidth: 450, width: "100%", padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Request Refund</h3>
            
            <form onSubmit={handleRequestRefund}>
              <div className="field" style={{ marginBottom: 24 }}>
                <label style={{ color: "#bbb", fontSize: 12, marginBottom: 6, display: "block" }}>Reason for Refund *</label>
                <textarea 
                  value={refundFormReason} 
                  onChange={(e) => setRefundFormReason(e.target.value)}
                  className="input-gold" 
                  rows={4}
                  required
                  placeholder="Please state the reason for requesting a refund..."
                  style={{ width: "100%", padding: "10px 12px", resize: "none" }}
                />
              </div>
              
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button 
                  type="button"
                  onClick={() => { setShowRefundModal(false); setRefundFormOrderId(""); setRefundFormReason(""); }}
                  style={{ padding: "10px 20px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#999", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-gold" style={{ padding: "10px 20px" }} disabled={submittingRefund}>
                  {submittingRefund ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default BuyerDashboard;