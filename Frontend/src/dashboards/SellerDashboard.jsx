import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { productAPI, orderAPI, userAPI, reportAPI, reviewAPI } from "../services/api";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import SellerReviews from "../components/seller/SellerReviews";
import ConfirmModal from "../components/common/ConfirmModal";
import { FiGrid, FiPackage, FiShoppingBag, FiBox, FiBarChart2, FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiChevronLeft, FiChevronRight, FiAlertTriangle, FiDollarSign, FiTrendingUp, FiUser, FiSettings, FiMail, FiPhone, FiMapPin, FiCheckCircle, FiStar, FiMessageSquare, FiDownload } from "react-icons/fi";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

const STATUS_COLORS = {
  PLACED: { bg: "#fef3c7", color: "#92400e" },
  PACKED: { bg: "#dbeafe", color: "#1e40af" },
  SHIPPED: { bg: "#e0e7ff", color: "#3730a3" },
  OUT_FOR_DELIVERY: { bg: "#ede9fe", color: "#5b21b6" },
  DELIVERED: { bg: "#dcfce7", color: "#166534" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b" },
  PAID: { bg: "#dcfce7", color: "#166534" },
  PENDING: { bg: "#fef3c7", color: "#92400e" },
  REFUNDED: { bg: "#fee2e2", color: "#991b1b" },
  COD_PENDING: { bg: "#ffedd5", color: "#9a3412" },
};

const StatusBadge = ({ status }) => {
  const s = (status || "").toUpperCase().replace(/ /g, "_");
  const c = STATUS_COLORS[s] || { bg: "#333", color: "#ccc" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {s.replace(/_/g, " ")}
    </span>
  );
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

const STATUS_FLOW = ["PLACED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

const SIZE_CATEGORIES = ["handmade clothes", "textiles", "shirt", "kurti", "blouse", "t-shirt", "dress", "skirt", "kids wear", "pant", "jacket"];
const WEIGHT_CATEGORIES = ["handmade snacks", "food", "pickles", "powders", "consumables"];
const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];
const ALL_WEIGHTS = ["100g", "250g", "500g", "1kg", "2kg", "5kg"];
const ALL_LENGTHS = ["1m", "2m", "3m", "5m", "10m"];
const ALL_VOLUMES = ["250ml", "500ml", "1L", "2L", "5L"];
const ALL_QUANTITIES = ["1 Piece", "Set of 2", "Set of 4", "Set of 6", "Set of 12"];

const SellerDashboard = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [reviewStats, setReviewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [profileForm, setProfileForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundRequests, setRefundRequests] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [confirmRefundAction, setConfirmRefundAction] = useState(null);
  const [searchParams] = useSearchParams();
  const perPage = 10;

  // Reports State
  const [reportRange, setReportRange] = useState("daily");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportSummary, setReportSummary] = useState(null);
  const [reportTrend, setReportTrend] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Read ?tab=profile from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  const [categoriesList, setCategoriesList] = useState(["Handmade Clothes", "Home Decor", "Accessories", "Snacks", "Crafts"]);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [form, setForm] = useState({
    name: "", category: "Handmade Clothes", productType: "", price: "", oldPrice: "", stock: "",
    description: "", handmadeStory: "", material: "", deliveryTime: "", featured: false,
    media: [{ url: "", type: "image/jpeg", name: "" }], sizes: [], weights: [],
    lengths: [], volumes: [], quantities: [], makingVideoUrl: "", makingVideoTitle: ""
  });

  const tabs = useMemo(() => {
    const list = [
      { key: "dashboard", label: "Overview", icon: <FiGrid /> },
      { key: "products", label: "Products", icon: <FiPackage /> },
      { key: "orders", label: "Orders", icon: <FiShoppingBag /> },
      { key: "reviews", label: "Reviews", icon: <FiStar /> },
      { key: "inventory", label: "Inventory", icon: <FiBox /> },
      { key: "reports", label: "Reports", icon: <FiBarChart2 /> },
    ];
    if ((stats.pendingRefunds && stats.pendingRefunds > 0) || activeTab === "refunds") {
      list.push({ key: "refunds", label: "Refunds", icon: <FiAlertTriangle />, badge: stats.pendingRefunds });
    }
    list.push(
      { key: "profile", label: "Profile", icon: <FiUser /> },
      { key: "settings", label: "Settings", icon: <FiSettings /> }
    );
    return list;
  }, [stats.pendingRefunds, activeTab]);

  const fetchCategories = async () => {
    try {
      const res = await productAPI.getCategories();
      const defaults = ["Handmade Clothes", "Home Decor", "Accessories", "Snacks", "Crafts"];
      const merged = Array.from(new Set([...defaults, ...(res.data || [])]));
      setCategoriesList(merged);
    } catch (e) {
      console.error("Error loading categories:", e);
    }
  };

  const loadOverviewData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [prodRes, orderRes, statsRes, revStatsRes] = await Promise.all([
        productAPI.getBySeller(user.id).catch(() => ({ data: [] })),
        orderAPI.getBySeller(user.id).catch(() => ({ data: [] })),
        orderAPI.getSellerStats(user.id).catch(() => ({ data: {} })),
        reviewAPI.getSellerStats(user.id).catch(() => null)
      ]);
      setProducts(prodRes.data || []);
      setOrders(orderRes.data || []);
      setStats(statsRes.data || {});
      setReviewStats(revStatsRes ? revStatsRes.data : null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadProductsData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const prodRes = await productAPI.getBySeller(user.id).catch(() => ({ data: [] }));
      setProducts(prodRes.data || []);
      await fetchCategories();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadOrdersData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const orderRes = await orderAPI.getBySeller(user.id).catch(() => ({ data: [] }));
      setOrders(orderRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadInventoryData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const prodRes = await productAPI.getBySeller(user.id).catch(() => ({ data: [] }));
      setProducts(prodRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadRefundRequestsData = async () => {
    if (!user?.id) return;
    setLoadingRefunds(true);
    try {
      const res = await orderAPI.getSellerRefundRequests(user.id);
      setRefundRequests(res.data || []);
      const statsRes = await orderAPI.getSellerStats(user.id).catch(() => ({ data: {} }));
      setStats(statsRes.data || {});
    } catch (e) {
      console.error(e);
      toast.error("Failed to load refund requests");
    }
    setLoadingRefunds(false);
  };

  const handleRefundAction = async (orderId, action) => {
    try {
      if (action === "approve") {
        await orderAPI.approveRefund(orderId);
        toast.success("Refund approved successfully");
      } else {
        await orderAPI.rejectRefund(orderId);
        toast.success("Refund request rejected");
      }
      loadRefundRequestsData();
    } catch (e) {
      toast.error(e.response?.data?.message || `Failed to ${action} refund`);
    } finally {
      setConfirmRefundAction(null);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    if (activeTab === "dashboard") loadOverviewData();
    else if (activeTab === "products") loadProductsData();
    else if (activeTab === "orders") loadOrdersData();
    else if (activeTab === "inventory") loadInventoryData();
    else if (activeTab === "refunds") loadRefundRequestsData();
  }, [user?.id, activeTab]);

  const showSize = useMemo(() => {
    const pt = (form.productType || "").toLowerCase();
    const sizeTypes = ["shirt", "kurti", "blouse", "t-shirt", "dress", "skirt", "pant", "kids wear", "jacket"];
    return sizeTypes.some(s => pt.includes(s));
  }, [form.productType]);

  const showLength = useMemo(() => {
    const pt = (form.productType || "").toLowerCase();
    const lengthTypes = ["saree", "dupatta", "fabric", "shawl", "scarf"];
    return lengthTypes.some(t => pt.includes(t));
  }, [form.productType]);

  const showWeight = useMemo(() => {
    const pt = (form.productType || "").toLowerCase();
    const weightTypes = ["snacks", "pickles", "food", "powders", "consumable products", "consumables", "consumable"];
    return weightTypes.some(t => pt.includes(t));
  }, [form.productType]);

  const showVolume = useMemo(() => {
    const pt = (form.productType || "").toLowerCase();
    const volumeTypes = ["oil", "juice", "liquid products", "liquid"];
    return volumeTypes.some(t => pt.includes(t));
  }, [form.productType]);

  const showQuantity = useMemo(() => {
    const pt = (form.productType || "").toLowerCase();
    const quantityTypes = ["jewellery", "accessories", "pots", "crafts", "home decor"];
    return quantityTypes.some(t => pt.includes(t));
  }, [form.productType]);

  const discount = useMemo(() => {
    const p = parseFloat(form.price);
    const op = parseFloat(form.oldPrice);
    if (op && op > p && p > 0) return Math.round(((op - p) / op) * 100);
    return 0;
  }, [form.price, form.oldPrice]);

  // UNAPPROVED SELLER GATE
  if (user && !user.approved && user.role === "seller") {
    return (
      <DashboardLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 20 }}>
          <FiAlertTriangle size={64} color="#f59e0b" />
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", color: "var(--gold)" }}>Pending Approval</h2>
          <p style={{ color: "#999", textAlign: "center", maxWidth: 500, lineHeight: 1.7 }}>
            Your seller account is awaiting admin approval. You will be able to add and manage products once your account is approved.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({ name: "", category: "Handmade Clothes", productType: "", price: "", oldPrice: "", stock: "", description: "", handmadeStory: "", material: "", deliveryTime: "", featured: false, media: [{ url: "", type: "image/jpeg", name: "" }], sizes: [], weights: [], lengths: [], volumes: [], quantities: [], makingVideoUrl: "", makingVideoTitle: "" });
    setNewCategoryName("");
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    const isDefault = ["Handmade Clothes", "Home Decor", "Accessories", "Snacks", "Crafts"].includes(p.category || "");
    setForm({
      name: p.name || "", category: p.category || "Handmade Clothes", productType: p.productType || "",
      price: p.price || "", oldPrice: p.oldPrice || "", stock: p.stock || "",
      description: p.description || "", handmadeStory: p.handmadeStory || "",
      material: p.material || "", deliveryTime: p.deliveryTime || "",
      featured: p.featured || false,
      media: (p.images || []).map(url => ({ url, type: "image/jpeg", name: "" })),
      sizes: p.sizes || [], weights: p.weights || [], lengths: p.lengths || [],
      volumes: p.volumes || [], quantities: p.quantities || [],
      makingVideoUrl: p.makingVideoUrl || "", makingVideoTitle: p.makingVideoTitle || ""
    });
    if (form.media.length === 0) form.media = [{ url: "", type: "image/jpeg", name: "" }];
    if (!isDefault && p.category) {
      setNewCategoryName(p.category);
    } else {
      setNewCategoryName("");
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.stock) { toast.error("Fill required fields"); return; }
    let finalCategory = form.category;
    if (form.category === "Others / Add New Category") {
      if (!newCategoryName.trim()) {
        toast.error("Please enter new category name");
        return;
      }
      finalCategory = newCategoryName.trim();
    }
    const payload = {
      name: form.name, category: finalCategory, productType: form.productType,
      price: parseFloat(form.price), oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : null,
      stock: parseInt(form.stock), description: form.description, handmadeStory: form.handmadeStory,
      material: form.material, deliveryTime: form.deliveryTime, featured: form.featured,
      sellerId: user.id, sellerName: user.name, sellerShopName: user.shopName || "", sellerProfileImage: user.profileImage || "",
      media: form.media.filter(m => m.url.trim()),
      sizes: showSize ? form.sizes : [],
      weights: showWeight ? form.weights : [],
      lengths: showLength ? form.lengths : [],
      volumes: showVolume ? form.volumes : [],
      quantities: showQuantity ? form.quantities : [],
      makingVideoUrl: form.makingVideoUrl || "",
      makingVideoTitle: form.makingVideoTitle || ""
    };
    try {
      if (editingProduct) {
        await productAPI.update(editingProduct.id || editingProduct._id, payload);
        toast.success("Product updated");
      } else {
        await productAPI.create(payload);
        toast.success("Product added");
      }
      setShowModal(false);
      await fetchCategories();
      if (activeTab === "products") loadProductsData();
      else if (activeTab === "inventory") loadInventoryData();
      else loadOverviewData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save product");
    }
  };

  const performDelete = async () => {
    if (!confirmDeleteProduct) return;
    try {
      await productAPI.delete(confirmDeleteProduct);
      toast.success("Product deleted");
      if (activeTab === "products") loadProductsData();
      else if (activeTab === "inventory") loadInventoryData();
      else loadOverviewData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed");
    } finally {
      setConfirmDeleteProduct(null);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      if (activeTab === "orders") loadOrdersData();
      else loadOverviewData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Status update failed");
    }
  };

  const handleReturnAction = async (orderId, productId, status) => {
    try {
      await orderAPI.updateReturnStatus(orderId, productId, status);
      toast.success(`Return request ${status === 'RETURN_APPROVED' ? 'approved' : 'rejected'} successfully`);
      if (activeTab === "orders") loadOrdersData();
      else loadOverviewData();
      
      // Update the selected order view
      const updatedOrder = await orderAPI.getBySeller(user.id).then(res => res.data.find(o => o.id === orderId));
      if (updatedOrder) setSelectedOrder(updatedOrder);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update return status");
    }
  };

  const handleProfileSave = async () => {
    try {
      const res = await userAPI.updateProfile(user.id, profileForm);
      updateUser(res.data);

      // Sync seller profile to all MongoDB products
      try {
        await productAPI.syncSellerProfile(user.id, {
          sellerName: profileForm.name,
          sellerShopName: profileForm.shopName,
          sellerProfileImage: profileForm.profileImage,
        });
      } catch (syncErr) {
        console.error("Product sync failed:", syncErr);
      }

      // Refresh products and dashboard data
      if (activeTab === "products") loadProductsData();
      else if (activeTab === "inventory") loadInventoryData();
      else loadOverviewData();
      toast.success("Profile updated & products synced");
      setIsEditing(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed");
    }
  };

  const handleProfileCancel = () => {
    setProfileForm({
      name: user.name || "", email: user.email || "", phone: user.phone || "",
      address: user.address || "", city: user.city || "", state: user.state || "",
      zip: user.zip || "", profileImage: user.profileImage || "",
      shopName: user.shopName || "", shopDescription: user.shopDescription || ""
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

  const addMediaRow = () => setForm({ ...form, media: [...form.media, { url: "", type: "image/jpeg", name: "" }] });
  const removeMediaRow = (i) => setForm({ ...form, media: form.media.filter((_, idx) => idx !== i) });
  const updateMedia = (i, field, val) => {
    const updated = [...form.media];
    updated[i] = { ...updated[i], [field]: val };
    setForm({ ...form, media: updated });
  };

  const toggleSize = (s) => {
    setForm({ ...form, sizes: form.sizes.includes(s) ? form.sizes.filter(x => x !== s) : [...form.sizes, s] });
  };
  const toggleWeight = (w) => {
    setForm({ ...form, weights: form.weights.includes(w) ? form.weights.filter(x => x !== w) : [...form.weights, w] });
  };
  const toggleLength = (l) => {
    setForm({ ...form, lengths: form.lengths.includes(l) ? form.lengths.filter(x => x !== l) : [...form.lengths, l] });
  };
  const toggleVolume = (v) => {
    setForm({ ...form, volumes: form.volumes.includes(v) ? form.volumes.filter(x => x !== v) : [...form.volumes, v] });
  };
  const toggleQuantity = (q) => {
    setForm({ ...form, quantities: form.quantities.includes(q) ? form.quantities.filter(x => x !== q) : [...form.quantities, q] });
  };

  // Filtered products for table
  const filteredProducts = products.filter(p => {
    if (searchTerm && !p.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCat && p.category !== filterCat) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * perPage, currentPage * perPage);

  const lowStockProducts = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10);
  const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);
  const topSelling = [...products].sort((a, b) => (b.soldQuantity || 0) - (a.soldQuantity || 0)).slice(0, 5);
  const recentOrders = [...orders].slice(0, 5);

  const cardStyle = (borderColor) => ({
    background: "#141414", borderRadius: 16, padding: "22px 24px", borderLeft: `4px solid ${borderColor}`,
    borderTop: "1px solid rgba(212,175,55,0.10)", borderRight: "1px solid rgba(212,175,55,0.10)", borderBottom: "1px solid rgba(212,175,55,0.10)",
  });

  const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
  const thStyle = { padding: "12px 14px", textAlign: "left", color: "#999", borderBottom: "1px solid #222", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 };
  const tdStyle = { padding: "12px 14px", borderBottom: "1px solid #1a1a1a", color: "#ddd" };

  const formatCurrency = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  // ============ REPORTS ============
  const generatePDF = async () => {
    try {
      const res = await reportAPI.downloadSellerReport(user.id, "pdf");
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seller_report_${user.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("PDF downloaded from backend");
    } catch (e) {
      toast.error("Failed to download PDF report");
    }
  };

  const generateExcel = async () => {
    try {
      const res = await reportAPI.downloadSellerReport(user.id, "excel");
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seller_report_${user.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("Excel downloaded from backend");
    } catch (e) {
      toast.error("Failed to download Excel report");
    }
  };

  const generateCSV = async () => {
    try {
      const res = await reportAPI.downloadSellerReport(user.id, "csv");
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seller_report_${user.id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("CSV downloaded from backend");
    } catch (e) {
      toast.error("Failed to download CSV report");
    }
  };

  const fetchReports = async () => {
    if (!user?.id) return;
    try {
      setLoadingReport(true);
      const [summaryRes, trendRes] = await Promise.all([
        reportAPI.getSellerSummary(user.id, reportRange, reportStartDate, reportEndDate),
        reportAPI.getSellerSalesTrend(user.id, reportRange, reportStartDate, reportEndDate)
      ]);
      setReportSummary(summaryRes.data);
      setReportTrend(trendRes.data);
    } catch (err) {
      console.error("Failed to fetch reports", err);
      toast.error("Failed to load report data");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reports") {
      fetchReports();
    }
  }, [activeTab, reportRange, reportStartDate, reportEndDate, user?.id]);

  const handleDownloadPDF = async () => {
    try {
      toast.info("Generating PDF report...");
      const res = await reportAPI.downloadSellerReport(user.id, "pdf", reportRange, reportStartDate, reportEndDate);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seller_report_${user.id}_${reportRange}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadCSV = async () => {
    try {
      toast.info("Generating CSV report...");
      const res = await reportAPI.downloadSellerReport(user.id, "csv", reportRange, reportStartDate, reportEndDate);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seller_report_${user.id}_${reportRange}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("CSV downloaded successfully");
    } catch (err) {
      toast.error("Failed to download CSV");
    }
  };

  if (loading) return (
    <DashboardLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {/* ============ DASHBOARD TAB ============ */}
      {activeTab === "dashboard" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 24 }}>Dashboard Overview</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Revenue", value: formatCurrency(stats.revenue), color: "#d4af37", icon: <FiDollarSign /> },
              { label: "Products", value: products.length, color: "#3b82f6", icon: <FiPackage /> },
              { label: "Total Orders", value: stats.totalOrders || 0, color: "#22c55e", icon: <FiShoppingBag /> },
              { label: "Items Sold", value: products.reduce((s, p) => s + (p.soldQuantity || 0), 0), color: "#8b5cf6", icon: <FiTrendingUp /> },
              { label: "Pending Returns", value: orders.reduce((sum, o) => sum + (o.items?.filter(i => i.sellerId === user.id && i.returnStatus === "RETURN_REQUESTED").length || 0), 0), color: "#ef4444", icon: <FiAlertTriangle /> },
              { label: "Refund Requests", value: stats.pendingRefunds || 0, color: "#ef4444", icon: <FiAlertTriangle /> },
              { label: "Pending", value: stats.pending || 0, color: "#f59e0b", icon: <FiBox /> },
              { label: "Low Stock", value: lowStockProducts.length, color: "#ef4444", icon: <FiAlertTriangle /> },
              { label: "Average Rating", value: reviewStats ? `${reviewStats.averageRating.toFixed(1)} / 5.0` : "0.0 / 5.0", color: "#eab308", icon: <FiStar /> },
              { label: "Total Reviews", value: reviewStats ? reviewStats.totalReviews : 0, color: "#eab308", icon: <FiMessageSquare /> },
            ].map((c, i) => (
              <div key={i} style={cardStyle(c.color)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: c.color, fontSize: 20 }}>{c.icon}</span>
                  <span style={{ color: "#999", fontSize: 12, fontWeight: 500 }}>{c.label}</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <div style={{ ...cardStyle("#d4af37"), borderLeft: "none", marginBottom: 24 }}>
            <h3 style={{ color: "var(--gold)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent Orders</h3>
            {recentOrders.length === 0 ? <p style={{ color: "#666" }}>No orders yet</p> : (
              <table style={tableStyle}>
                <thead><tr>
                  <th style={thStyle}>Order ID</th><th style={thStyle}>Buyer</th><th style={thStyle}>Total</th><th style={thStyle}>Status</th>
                </tr></thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.id}>
                      <td style={tdStyle}>{o.id?.slice(-8)}</td>
                      <td style={tdStyle}>{o.fullName || o.userName}</td>
                      <td style={tdStyle}>{formatCurrency(o.totalAmount)}</td>
                      <td style={tdStyle}><StatusBadge status={o.orderStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top Selling & Low Stock side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ ...cardStyle("#22c55e"), borderLeft: "none" }}>
              <h3 style={{ color: "#22c55e", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top Selling</h3>
              {topSelling.map(p => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a1a", fontSize: 13 }}>
                  <span style={{ color: "#ddd" }}>{p.name}</span>
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>{p.soldQuantity || 0} sold</span>
                </div>
              ))}
            </div>
            <div style={{ ...cardStyle("#ef4444"), borderLeft: "none" }}>
              <h3 style={{ color: "#ef4444", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Low Stock Alerts</h3>
              {lowStockProducts.length === 0 ? <p style={{ color: "#666", fontSize: 13 }}>All stocked</p> :
                lowStockProducts.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a1a", fontSize: 13 }}>
                    <span style={{ color: "#ddd" }}>{p.name}</span>
                    <span style={{ color: "#ef4444", fontWeight: 600 }}>{p.stock} left</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ============ PRODUCTS TAB ============ */}
      {activeTab === "products" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)" }}>Products</h2>
            <button onClick={openAddModal} className="btn-gold" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px" }}>
              <FiPlus /> Add Product
            </button>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <FiSearch style={{ position: "absolute", left: 12, top: 12, color: "#666" }} />
              <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Search products..." className="input-gold" style={{ paddingLeft: 36, width: "100%" }} />
            </div>
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setCurrentPage(1); }} className="input-gold" style={{ minWidth: 160 }}>
              <option value="">All Categories</option>
              {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ background: "#141414", borderRadius: 16, border: "1px solid rgba(212,175,55,0.10)", overflow: "auto" }}>
            <table style={tableStyle}>
              <thead><tr>
                <th style={thStyle}>Image</th><th style={thStyle}>Name</th><th style={thStyle}>Category</th>
                <th style={thStyle}>Price</th><th style={thStyle}>MRP</th><th style={thStyle}>Off</th>
                <th style={thStyle}>Stock</th><th style={thStyle}>Sold</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th>
              </tr></thead>
              <tbody>
                {paginatedProducts.map(p => {
                  const img = p.images?.[0] || (p.media?.[0]?.url) || "";
                  return (
                    <tr key={p.id || p._id} style={{ transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={tdStyle}><img src={img || "https://via.placeholder.com/40"} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} /></td>
                      <td style={{ ...tdStyle, fontWeight: 500, color: "#fff", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                      <td style={tdStyle}>{p.category}</td>
                      <td style={tdStyle}>{formatCurrency(p.price)}</td>
                      <td style={{ ...tdStyle, color: "#888" }}>{p.oldPrice ? formatCurrency(p.oldPrice) : "-"}</td>
                      <td style={tdStyle}>{p.offer ? <span style={{ color: "#22c55e", fontWeight: 600 }}>{p.offer}%</span> : "-"}</td>
                      <td style={tdStyle}>
                        <span style={{ color: (p.stock || 0) === 0 ? "#ef4444" : (p.stock || 0) < 10 ? "#f59e0b" : "#22c55e", fontWeight: 600 }}>
                           {p.stock || 0}
                        </span>
                      </td>
                      <td style={tdStyle}>{p.soldQuantity || 0}</td>
                       <td style={tdStyle}>
                         {!p.approved ? (
                           <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 12 }}>Pending Approval</span>
                         ) : (
                           <StatusBadge status={(p.stock || 0) === 0 ? "Out of Stock" : (p.stock || 0) < 10 ? "Low Stock" : "Active"} />
                         )}
                       </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 6 }}>
                           <button onClick={() => openEditModal(p)} style={{ background: "rgba(212,175,55,0.15)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#d4af37" }}><FiEdit2 size={14} /></button>
                           <button onClick={() => setConfirmDeleteProduct(p.id || p._id)} style={{ background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#ef4444" }}><FiTrash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProducts.length === 0 && <p style={{ textAlign: "center", padding: 32, color: "#666" }}>No products found</p>}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ background: "#141414", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#ddd" }}><FiChevronLeft /></button>
              <span style={{ color: "#999", fontSize: 13 }}>Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ background: "#141414", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#ddd" }}><FiChevronRight /></button>
            </div>
          )}
        </div>
      )}

      {/* ============ ORDERS TAB ============ */}
      {activeTab === "orders" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 20 }}>Orders</h2>
          <div style={{ background: "#141414", borderRadius: 16, border: "1px solid rgba(212,175,55,0.10)", overflow: "auto" }}>
            <table style={tableStyle}>
              <thead><tr>
                <th style={thStyle}>Order ID</th><th style={thStyle}>Buyer</th><th style={thStyle}>Phone</th>
                <th style={thStyle}>Payment</th><th style={thStyle}>Pay Status</th><th style={thStyle}>Order Status</th>
                <th style={thStyle}>Total</th><th style={thStyle}>Actions</th>
              </tr></thead>
              <tbody>
                {orders.map(o => {
                  const currentIdx = STATUS_FLOW.indexOf(o.orderStatus);
                  const canUpdate = o.orderStatus !== "DELIVERED" && o.orderStatus !== "CANCELLED";
                  
                  // Check if any item belonging to this seller has a return request
                  const hasReturnRequest = o.items?.some(item => item.sellerId === user.id && item.returnStatus === "RETURN_REQUESTED");
                  
                  return (
                    <tr key={o.id} style={{ background: hasReturnRequest ? "rgba(245,158,11,0.05)" : "transparent" }}>
                      <td style={tdStyle}>
                        {o.id?.slice(-8)}
                        {hasReturnRequest && (
                          <span style={{ display: "block", color: "#f59e0b", fontSize: 10, fontWeight: 600, marginTop: 4 }}>
                            Return Pending
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>{o.fullName || o.userName}</td>
                      <td style={tdStyle}>{o.phone || "-"}</td>
                      <td style={tdStyle}>{o.paymentMethod}</td>
                      <td style={tdStyle}><StatusBadge status={o.paymentStatus} /></td>
                      <td style={tdStyle}><StatusBadge status={o.orderStatus} /></td>
                      <td style={tdStyle}>{formatCurrency(o.totalAmount)}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <button onClick={() => setSelectedOrder(o)} className="btn-gold" style={{ padding: "4px 10px", fontSize: 11 }}>View Details</button>
                          {canUpdate && (
                            <select
                              value=""
                              onChange={e => { if (e.target.value) handleStatusUpdate(o.id, e.target.value); }}
                              className="input-gold"
                              style={{ fontSize: 11, padding: "4px 8px", minWidth: 100 }}
                            >
                              <option value="">Update to...</option>
                              {STATUS_FLOW.slice(currentIdx + 1).map(s => (
                                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && <p style={{ textAlign: "center", padding: 32, color: "#666" }}>No orders yet</p>}
          </div>

          {/* ORDER DETAIL MODAL */}
          {selectedOrder && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", overflowY: "auto" }}
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
                    <p style={{ color: "#888", fontSize: 12 }}>Total Items (Your Shop)</p>
                    <p style={{ color: "var(--gold)", fontWeight: 700, fontSize: 16 }}>
                      {selectedOrder.items?.filter(i => i.sellerId === user.id).length || 0}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>Your Items in this Order</p>
                  {selectedOrder.items?.filter(i => i.sellerId === user.id).map((item, idx) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", padding: "12px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {item.image && <img src={item.image} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />}
                        <div style={{ flex: 1 }}>
                          <p style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>{item.productName}</p>
                          <p style={{ color: "#888", fontSize: 12 }}>Qty: {item.quantity} {item.selectedSize && `| Size: ${item.selectedSize}`} {item.selectedWeight && `| Weight: ${item.selectedWeight}`}</p>
                        </div>
                        <p style={{ color: "#d4af37", fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                      
                      {/* Return Information Section */}
                      {item.returnStatus && (
                        <div style={{ marginTop: 16, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                              <p style={{ color: "#bbb", fontSize: 12, marginBottom: 4 }}>Return Requested By Buyer</p>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, 
                                  background: item.returnStatus === "RETURN_REQUESTED" ? "rgba(245,158,11,0.15)" : item.returnStatus === "RETURN_APPROVED" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                                  color: item.returnStatus === "RETURN_REQUESTED" ? "#f59e0b" : item.returnStatus === "RETURN_APPROVED" ? "#22c55e" : "#ef4444" }}>
                                {item.returnStatus.replace(/_/g, " ")}
                              </span>
                            </div>
                            
                            {item.returnStatus === "RETURN_REQUESTED" && (
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => handleReturnAction(selectedOrder.id, item.productId, "RETURN_REJECTED")} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Reject</button>
                                <button onClick={() => handleReturnAction(selectedOrder.id, item.productId, "RETURN_APPROVED")} style={{ padding: "6px 12px", background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Approve Return</button>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                            <div>
                              <p style={{ color: "#777", fontSize: 11 }}>Reason</p>
                              <p style={{ color: "#eee", fontSize: 13 }}>{item.returnReason}</p>
                            </div>
                            {item.returnCustomReason && (
                              <div>
                                <p style={{ color: "#777", fontSize: 11 }}>Additional Details</p>
                                <p style={{ color: "#ccc", fontSize: 13, background: "#0d0d0d", padding: "8px 12px", borderRadius: 6, marginTop: 4 }}>{item.returnCustomReason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Shipping */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>Buyer Details</p>
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ INVENTORY TAB ============ */}
      {activeTab === "inventory" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 20 }}>Inventory</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={cardStyle("#3b82f6")}><p style={{ color: "#999", fontSize: 12 }}>Total Products</p><p style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{products.length}</p></div>
            <div style={cardStyle("#f59e0b")}><p style={{ color: "#999", fontSize: 12 }}>Low Stock (&lt;10)</p><p style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{lowStockProducts.length}</p></div>
            <div style={cardStyle("#ef4444")}><p style={{ color: "#999", fontSize: 12 }}>Out of Stock</p><p style={{ fontSize: 28, fontWeight: 700, color: "#ef4444" }}>{outOfStockProducts.length}</p></div>
          </div>

          {lowStockProducts.length > 0 && (
            <div style={{ ...cardStyle("#f59e0b"), borderLeft: "none", marginBottom: 20 }}>
              <h3 style={{ color: "#f59e0b", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Low Stock Products</h3>
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>Product</th><th style={thStyle}>Category</th><th style={thStyle}>Stock</th><th style={thStyle}>Sold</th></tr></thead>
                <tbody>{lowStockProducts.map(p => (
                  <tr key={p.id}><td style={tdStyle}>{p.name}</td><td style={tdStyle}>{p.category}</td><td style={{ ...tdStyle, color: "#f59e0b", fontWeight: 600 }}>{p.stock}</td><td style={tdStyle}>{p.soldQuantity || 0}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {outOfStockProducts.length > 0 && (
            <div style={{ ...cardStyle("#ef4444"), borderLeft: "none" }}>
              <h3 style={{ color: "#ef4444", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Out of Stock Products</h3>
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>Product</th><th style={thStyle}>Category</th><th style={thStyle}>Sold</th></tr></thead>
                <tbody>{outOfStockProducts.map(p => (
                  <tr key={p.id}><td style={tdStyle}>{p.name}</td><td style={tdStyle}>{p.category}</td><td style={tdStyle}>{p.soldQuantity || 0}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ REPORTS TAB ============ */}
      {activeTab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", margin: 0 }}>Reports</h2>
          </div>

          <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>Time Range</label>
              <select value={reportRange} onChange={(e) => setReportRange(e.target.value)} style={{ padding: "8px 12px", background: "#0a0a0a", border: "1px solid #333", borderRadius: 6, color: "#fff" }}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>Start Date</label>
              <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} style={{ padding: "8px 12px", background: "#0a0a0a", border: "1px solid #333", borderRadius: 6, color: "#fff", colorScheme: "dark" }} />
            </div>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>End Date</label>
              <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} style={{ padding: "8px 12px", background: "#0a0a0a", border: "1px solid #333", borderRadius: 6, color: "#fff", colorScheme: "dark" }} />
            </div>
            <div style={{ flex: 1, display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={handleDownloadPDF} className="btn-gold" style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}><FiDownload /> PDF</button>
              <button onClick={handleDownloadCSV} style={{ padding: "8px 16px", background: "#222", border: "1px solid #444", borderRadius: 6, color: "#fff", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><FiDownload /> CSV</button>
            </div>
          </div>

          <div style={{ padding: 12, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8 }}>
            <p style={{ color: "#22c55e", fontSize: 12, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <FiCheckCircle /> Razorpay Online Payment & COD metrics are fully integrated and synced with reports.
            </p>
          </div>

          {loadingReport ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" /></div>
          ) : !reportSummary ? (
            <p style={{ color: "#888", textAlign: "center", padding: 40 }}>No report data available</p>
          ) : (
            <>
              {/* Header Card */}
              <div style={{ background: "linear-gradient(145deg, #1a1a1a 0%, #111 100%)", padding: 24, borderRadius: 16, border: "1px solid rgba(212,175,55,0.2)", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ color: "var(--gold)", fontSize: 20, margin: "0 0 4px 0" }}>{reportSummary.brandName}</h3>
                  <p style={{ color: "#fff", fontSize: 16, fontWeight: 500, margin: "0 0 16px 0" }}>{reportSummary.reportTitle} ({reportSummary.reportType})</p>
                  <p style={{ color: "#888", fontSize: 13, margin: "0 0 4px 0" }}>Seller: <span style={{ color: "#ccc" }}>{reportSummary.seller?.sellerName || user?.name}</span></p>
                  <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Shop: <span style={{ color: "#ccc" }}>{reportSummary.seller?.shopName || user?.shopName || "HeritCraft Seller"}</span></p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#888", fontSize: 12, margin: "0 0 4px 0" }}>Generated: {reportSummary.generatedAt}</p>
                  <p style={{ color: "#888", fontSize: 12, margin: 0 }}>Range: {reportSummary.dateRange.startDate} to {reportSummary.dateRange.endDate}</p>
                </div>
              </div>

              {/* Report Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 16, marginBottom: 24 }}>
                {[
                  { label: "Total Sales", value: formatCurrency(reportSummary.summary.totalSales), color: "#d4af37" },
                  { label: "Total Orders", value: reportSummary.summary.totalOrders, color: "#3b82f6" },
                  { label: "Products Sold", value: reportSummary.summary.totalProductsSold, color: "#8b5cf6" },
                  { label: "Average Order Value", value: formatCurrency(reportSummary.summary.averageOrderValue), color: "#22c55e" },
                  { label: "COD Revenue", value: formatCurrency(reportSummary.summary.codRevenue), color: "#d4af37" },
                  { label: "Razorpay Online Revenue", value: formatCurrency(reportSummary.summary.razorpayRevenue), color: "#d4af37" },
                  { label: "Pending COD Amount", value: formatCurrency(reportSummary.summary.pendingCodAmount), color: "#f59e0b" },
                  { label: "Paid Orders", value: reportSummary.summary.paidOrders, color: "#22c55e" },
                  { label: "Failed Payments", value: reportSummary.summary.failedPayments, color: "#ef4444" },
                ].map((stat, idx) => (
                  <div key={idx} style={{ background: "#141414", borderRadius: 12, padding: "16px 20px", border: "1px solid rgba(212,175,55,0.1)", borderLeft: `4px solid ${stat.color}` }}>
                    <p style={{ color: "#888", fontSize: 11, margin: "0 0 6px 0", textTransform: "uppercase", fontWeight: 500 }}>{stat.label}</p>
                    <p style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>{stat.value}</p>
                  </div>
                ))}
              </div>              {/* Charts */}
              {reportTrend.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
                  <div style={{ background: "#141414", padding: 24, borderRadius: 12, border: "1px solid #222" }}>
                    <h3 style={{ color: "#fff", fontSize: 15, marginBottom: 20 }}>Sales Trend (Revenue)</h3>
                    <div style={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="period" stroke="#888" fontSize={12} tickMargin={10} />
                          <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                          <RechartsTooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#d4af37" }} />
                          <Line type="monotone" dataKey="totalSales" name="Revenue" stroke="#d4af37" strokeWidth={3} dot={{ r: 4, fill: "#111", stroke: "#d4af37", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div style={{ background: "#141414", padding: 24, borderRadius: 12, border: "1px solid #222" }}>
                      <h3 style={{ color: "#fff", fontSize: 15, marginBottom: 20 }}>Orders & Products</h3>
                      <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportTrend} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="period" stroke="#888" fontSize={12} />
                            <YAxis stroke="#888" fontSize={12} />
                            <RechartsTooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }} />
                            <Legend />
                            <Bar dataKey="totalOrders" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="totalProductsSold" name="Products" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div style={{ background: "#141414", padding: 24, borderRadius: 12, border: "1px solid #222" }}>
                      <h3 style={{ color: "#fff", fontSize: 15, marginBottom: 20 }}>Top Selling Products</h3>
                      {reportSummary.topProducts?.length > 0 ? (
                        <div style={{ height: 250 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportSummary.topProducts} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                              <XAxis type="number" stroke="#888" fontSize={12} />
                              <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={100} />
                              <RechartsTooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }} />
                              <Bar dataKey="sold" name="Units Sold" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p style={{ color: "#888", textAlign: "center", paddingTop: 80 }}>No products sold</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#888", textAlign: "center", padding: 40, background: "#141414", borderRadius: 12, border: "1px solid #222" }}>No sales data in this period.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ============ REVIEWS TAB ============ */}
      {activeTab === "reviews" && (
        <SellerReviews />
      )}

      {/* ============ REFUNDS TAB ============ */}
      {activeTab === "refunds" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 20 }}>Refund Requests</h2>
          
          {loadingRefunds ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div style={{ background: "#141414", borderRadius: 16, border: "1px solid rgba(212,175,55,0.10)", overflow: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Order ID</th>
                    <th style={thStyle}>Date Requested</th>
                    <th style={thStyle}>Buyer</th>
                    <th style={thStyle}>Your Items</th>
                    <th style={thStyle}>Refund Reason</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {refundRequests.map(r => {
                    const sellerItems = r.items?.filter(item => item.sellerId === user.id) || [];
                    const isPending = r.refundStatus === "REQUESTED";
                    return (
                      <tr key={r.id}>
                        <td style={tdStyle}>#{r.id?.slice(-8)}</td>
                        <td style={tdStyle}>{formatDate(r.refundRequestedAt)}</td>
                        <td style={tdStyle}>
                          <p style={{ margin: 0, fontWeight: 600 }}>{r.fullName || r.userName}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "#888" }}>{r.userEmail}</p>
                        </td>
                        <td style={tdStyle}>
                          {sellerItems.map((item, idx) => (
                            <div key={idx} style={{ fontSize: 12, color: "#ccc" }}>
                              {item.productName} (x{item.quantity})
                            </div>
                          ))}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: 200, wordWrap: "break-word", whiteSpace: "normal" }}>
                          "{r.refundReason || "No reason provided"}"
                        </td>
                        <td style={tdStyle}>
                          <RefundStatusBadge status={r.refundStatus} />
                        </td>
                        <td style={tdStyle}>
                          {isPending ? (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => setConfirmRefundAction({ orderId: r.id, action: "approve" })}
                                className="btn-gold"
                                style={{ padding: "6px 12px", fontSize: 11, background: "linear-gradient(135deg,#22c55e,#166534)", color: "#fff" }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setConfirmRefundAction({ orderId: r.id, action: "reject" })}
                                style={{ padding: "6px 12px", fontSize: 11, background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, cursor: "pointer" }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#666", fontSize: 12 }}>Processed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {refundRequests.length === 0 && (
                <p style={{ textAlign: "center", padding: 32, color: "#666" }}>No refund requests found</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============ PROFILE TAB ============ */}
      {activeTab === "profile" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", margin: 0 }}>Seller Profile</h2>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="btn-gold" style={{ padding: "8px 24px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <FiEdit2 size={14} /> Edit Profile
              </button>
            )}
          </div>

          <div style={{ background: "#141414", borderRadius: 16, padding: 28, border: "1px solid rgba(212,175,55,0.10)", maxWidth: 700, marginBottom: 24 }}>
            {/* Profile Card Header */}
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
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <span style={{ padding: "3px 12px", borderRadius: 20, background: user?.approved ? "#22c55e" : "#f59e0b", color: user?.approved ? "#fff" : "#000", fontSize: 11, fontWeight: 700 }}>{user?.approved ? "Approved Seller" : "Pending Approval"}</span>
                </div>
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

            {/* Business Information */}
            <h3 style={{ color: "var(--gold)", fontSize: 14, fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5, paddingTop: 16, borderTop: "1px solid rgba(212,175,55,0.08)" }}>Business Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div className="field">
                <label>Shop Name</label>
                {isEditing ? <input value={profileForm.shopName || ""} onChange={e => setProfileForm({ ...profileForm, shopName: e.target.value })} className="input-gold" placeholder="Shop Name" /> : <p style={{ color: "#ddd", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222" }}>{user?.shopName || "-"}</p>}
              </div>
              <div className="field">
                <label>Approval Status</label>
                <p style={{ color: "#ddd", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222", display: "flex", alignItems: "center", gap: 6 }}>
                  <FiCheckCircle size={14} style={{ color: user?.approved ? "#22c55e" : "#f59e0b" }} />
                  {user?.approved ? "Approved" : "Pending Approval"}
                </p>
              </div>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <label>Shop Description</label>
                {isEditing ? <textarea value={profileForm.shopDescription || ""} onChange={e => setProfileForm({ ...profileForm, shopDescription: e.target.value })} className="input-gold" placeholder="Describe your shop" rows={3} /> : <p style={{ color: "#ddd", fontSize: 14, padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #222", lineHeight: 1.6 }}>{user?.shopDescription || "-"}</p>}
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

      {/* ============ SETTINGS TAB ============ */}
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

      {/* ============ ADD/EDIT PRODUCT MODAL ============ */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", overflowY: "auto" }}>
          <div style={{ background: "#111", borderRadius: 20, border: "1px solid rgba(212,175,55,0.2)", maxWidth: 700, width: "100%", padding: 32, position: "relative" }}>
            <button onClick={() => setShowModal(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#999", cursor: "pointer" }}><FiX size={24} /></button>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", color: "var(--gold)", marginBottom: 24 }}>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field"><label>Product Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-gold" placeholder="Product name" /></div>
              <div className="field"><label>Category *</label>
                <select 
                  value={form.category} 
                  onChange={e => {
                    setForm({ ...form, category: e.target.value });
                    if (e.target.value !== "Others / Add New Category") setNewCategoryName("");
                  }} 
                  className="input-gold"
                >
                  {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Others / Add New Category">Others / Add New Category</option>
                </select>
              </div>
              {form.category === "Others / Add New Category" && (
                <div className="field" style={{ gridColumn: "span 2" }}>
                  <label>New Category Name *</label>
                  <input 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)} 
                    className="input-gold" 
                    placeholder="Enter new category name" 
                  />
                </div>
              )}
              <div className="field"><label>Product Type</label><input value={form.productType} onChange={e => setForm({ ...form, productType: e.target.value })} className="input-gold" placeholder="e.g. Kurti, Saree" /></div>
              <div className="field"><label>Material</label><input value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} className="input-gold" placeholder="e.g. Cotton, Clay" /></div>
              <div className="field"><label>Price *</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input-gold" placeholder="Selling price" /></div>
              <div className="field"><label>MRP / Old Price {discount > 0 && <span style={{ color: "#22c55e", fontSize: 12 }}>({discount}% off)</span>}</label><input type="number" value={form.oldPrice} onChange={e => setForm({ ...form, oldPrice: e.target.value })} className="input-gold" placeholder="Original price" /></div>
              <div className="field"><label>Stock *</label><input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="input-gold" placeholder="Available quantity" /></div>
              <div className="field"><label>Delivery Time</label><input value={form.deliveryTime} onChange={e => setForm({ ...form, deliveryTime: e.target.value })} className="input-gold" placeholder="e.g. 3-5 days" /></div>
              <div className="field"><label>Making Video Title</label><input value={form.makingVideoTitle} onChange={e => setForm({ ...form, makingVideoTitle: e.target.value })} className="input-gold" placeholder="e.g. Handmade weaving process" /></div>
              <div className="field"><label>Making Video URL</label><input value={form.makingVideoUrl} onChange={e => setForm({ ...form, makingVideoUrl: e.target.value })} className="input-gold" placeholder="YouTube or direct MP4 URL" /></div>
            </div>

            <div className="field" style={{ marginTop: 16 }}><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-gold" rows={3} placeholder="Product description" /></div>
            <div className="field"><label>Handmade Story</label><textarea value={form.handmadeStory} onChange={e => setForm({ ...form, handmadeStory: e.target.value })} className="input-gold" rows={2} placeholder="The story behind this product" /></div>

            <div className="field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} id="featured-check" />
              <label htmlFor="featured-check" style={{ margin: 0, cursor: "pointer" }}>Featured Product</label>
            </div>

            {/* Media URLs */}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <label style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8, display: "block" }}>Image URLs</label>
              {form.media.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={m.url} onChange={e => updateMedia(i, "url", e.target.value)} className="input-gold" style={{ flex: 1 }} placeholder="Image URL" />
                  {form.media.length > 1 && <button onClick={() => removeMediaRow(i)} style={{ background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 8, padding: "8px", cursor: "pointer", color: "#ef4444" }}><FiX size={14} /></button>}
                </div>
              ))}
              <button onClick={addMediaRow} style={{ background: "rgba(212,175,55,0.1)", border: "1px dashed rgba(212,175,55,0.3)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: "#d4af37", fontSize: 13 }}>+ Add Image</button>
            </div>

            {/* Sizes */}
            {showSize && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8, display: "block" }}>Available Sizes</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_SIZES.map(s => (
                    <button key={s} type="button" onClick={() => toggleSize(s)} style={{
                      padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                      background: form.sizes.includes(s) ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                      border: form.sizes.includes(s) ? "1px solid #d4af37" : "1px solid #333",
                      color: form.sizes.includes(s) ? "#d4af37" : "#999",
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Weights */}
            {showWeight && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8, display: "block" }}>Available Weights</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_WEIGHTS.map(w => (
                    <button key={w} type="button" onClick={() => toggleWeight(w)} style={{
                      padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                      background: form.weights.includes(w) ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                      border: form.weights.includes(w) ? "1px solid #d4af37" : "1px solid #333",
                      color: form.weights.includes(w) ? "#d4af37" : "#999",
                    }}>{w}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Lengths */}
            {showLength && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8, display: "block" }}>Available Lengths</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_LENGTHS.map(l => (
                    <button key={l} type="button" onClick={() => toggleLength(l)} style={{
                      padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                      background: form.lengths.includes(l) ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                      border: form.lengths.includes(l) ? "1px solid #d4af37" : "1px solid #333",
                      color: form.lengths.includes(l) ? "#d4af37" : "#999",
                    }}>{l}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Volumes */}
            {showVolume && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8, display: "block" }}>Available Volumes</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_VOLUMES.map(v => (
                    <button key={v} type="button" onClick={() => toggleVolume(v)} style={{
                      padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                      background: form.volumes.includes(v) ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                      border: form.volumes.includes(v) ? "1px solid #d4af37" : "1px solid #333",
                      color: form.volumes.includes(v) ? "#d4af37" : "#999",
                    }}>{v}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantities */}
            {showQuantity && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#ccc", fontSize: 13, fontWeight: 500, marginBottom: 8, display: "block" }}>Available Quantity Options</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_QUANTITIES.map(q => (
                    <button key={q} type="button" onClick={() => toggleQuantity(q)} style={{
                      padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                      background: form.quantities.includes(q) ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                      border: form.quantities.includes(q) ? "1px solid #d4af37" : "1px solid #333",
                      color: form.quantities.includes(q) ? "#d4af37" : "#999",
                    }}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={handleSave} className="btn-gold" style={{ flex: 1, padding: "12px" }}>
                {editingProduct ? "Update Product" : "Add Product"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#999", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteProduct}
        title="Delete Product"
        message="Are you sure you want to delete this product?"
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={performDelete}
        onCancel={() => setConfirmDeleteProduct(null)}
      />

      {/* Refund Request Actions Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmRefundAction}
        title={confirmRefundAction?.action === "approve" ? "Approve Refund" : "Reject Refund"}
        message={confirmRefundAction?.action === "approve" 
          ? "Are you sure you want to approve this refund request? This will update the order status and notify the buyer."
          : "Are you sure you want to reject this refund request?"
        }
        confirmText={confirmRefundAction?.action === "approve" ? "Approve" : "Reject"}
        cancelText="Cancel"
        type={confirmRefundAction?.action === "approve" ? "success" : "danger"}
        onConfirm={() => handleRefundAction(confirmRefundAction.orderId, confirmRefundAction.action)}
        onCancel={() => setConfirmRefundAction(null)}
      />
    </DashboardLayout>
  );
};

export default SellerDashboard;