import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { userAPI, productAPI, orderAPI, reportAPI } from "../services/api";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import AdminReviews from "../components/admin/AdminReviews";
import ConfirmModal from "../components/common/ConfirmModal";
import { FiGrid, FiUsers, FiShoppingBag, FiPackage, FiBarChart2, FiCheck, FiX, FiUserCheck, FiUserX, FiUser, FiSettings, FiMail, FiPhone, FiMapPin, FiEdit2, FiShield, FiStar, FiDownload, FiAlertTriangle, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
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

const AdminDashboard = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserActivity, setSelectedUserActivity] = useState(null);
  const [refundRequests, setRefundRequests] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [confirmRefundAction, setConfirmRefundAction] = useState(null);
  const [confirmSellerAction, setConfirmSellerAction] = useState(null);
  const [confirmUserStatusAction, setConfirmUserStatusAction] = useState(null);
  const [confirmProductAction, setConfirmProductAction] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(null);
  const [searchParams] = useSearchParams();
  const [adminOrdersPage, setAdminOrdersPage] = useState(1);
  const adminOrdersPerPage = 8;

  // Read ?tab=profile from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== "dashboard" && tabParam !== "overview") {
      setActiveTab(tabParam);
    } else if (tabParam === "dashboard" || tabParam === "overview") {
      setActiveTab("users");
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "orders") {
      setAdminOrdersPage(1);
    }
  }, [activeTab, orders.length]);

  // Reports State
  const [reportRange, setReportRange] = useState("daily");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportSummary, setReportSummary] = useState(null);
  const [reportTrend, setReportTrend] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const tabs = useMemo(() => {
    const list = [
      { key: "sellers", label: "Sellers", icon: <FiUserCheck /> },
      { key: "users", label: "Users", icon: <FiUsers /> },
      { key: "products", label: "Products", icon: <FiPackage /> },
      { key: "orders", label: "Orders", icon: <FiShoppingBag /> },
      { key: "reviews", label: "Reviews", icon: <FiStar /> },
    ];
    list.push({ key: "refunds", label: "Refunds", icon: <FiAlertTriangle />, badge: orderStats.pendingRefunds });
    list.push(
      { key: "reports", label: "Reports", icon: <FiBarChart2 /> },
      { key: "profile", label: "Profile", icon: <FiUser /> },
      { key: "settings", label: "Settings", icon: <FiSettings /> }
    );
    return list;
  }, [orderStats.pendingRefunds]);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, usersRes, sellersRes, prodRes, ordersRes] = await Promise.all([
        orderAPI.getAdminStats(),
        userAPI.getPendingSellers(),
        userAPI.getAll(),
        userAPI.getSellers(),
        productAPI.getAllAdmin(),
        orderAPI.getAllAdmin(),
      ]);
      setOrderStats(statsRes.data || {});
      setPendingSellers(pendingRes.data || []);
      setUsers(usersRes.data || []);
      setSellers(sellersRes.data || []);
      setProducts(prodRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadSellersData = async () => {
    setLoading(true);

    try {
      const [sellersRes, pendingRes, prodRes, ordersRes] = await Promise.all([
        userAPI.getSellers(),
        userAPI.getPendingSellers(),
        productAPI.getAllAdmin(),
        orderAPI.getAllAdmin(),
      ]);

      setSellers(sellersRes.data || []);
      setPendingSellers(pendingRes.data || []);
      setProducts(prodRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load sellers");
    } finally {
      setLoading(false);
    }
  };

  const loadUsersData = async () => {
    setLoading(true);

    try {
      const [usersRes, ordersRes, prodRes] = await Promise.all([
        userAPI.getAll(),
        orderAPI.getAllAdmin(),
        productAPI.getAllAdmin(),
      ]);

      setUsers(usersRes.data || []);
      setOrders(ordersRes.data || []);
      setProducts(prodRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadProductsData = async () => {
    setLoading(true);
    try {
      const prodRes = await productAPI.getAllAdmin();
      setProducts(prodRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadOrdersData = async () => {
    setLoading(true);
    try {
      const ordersRes = await orderAPI.getAllAdmin();
      setOrders(ordersRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Dynamically load data based on active tab
  const loadRefundRequestsData = async () => {
    setLoadingRefunds(true);
    try {
      const res = await orderAPI.getAdminRefundRequests();
      setRefundRequests(res.data || []);
      const statsRes = await orderAPI.getAdminStats().catch(() => ({ data: {} }));
      setOrderStats(statsRes.data || {});
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
    if (activeTab === "sellers") loadSellersData();
    else if (activeTab === "users") loadUsersData();
    else if (activeTab === "products") loadProductsData();
    else if (activeTab === "orders") loadOrdersData();
    else if (activeTab === "refunds") loadRefundRequestsData();
  }, [activeTab]);

  const handleApprove = async (id) => {
    try {
      await userAPI.approveSeller(id);
      await productAPI.updateSellerApproval(id, true);
      toast.success("Seller approved");
      if (activeTab === "sellers") loadSellersData();
      else loadSellersData();
    } catch (e) { toast.error(e.response?.data?.message || "Approve failed"); }
  };

  const handleReject = async (id) => {
    try {
      await userAPI.rejectSeller(id);
      await productAPI.updateSellerApproval(id, false);
      toast.success("Seller rejected");
      if (activeTab === "sellers") loadSellersData();
      else loadSellersData();
    } catch (e) { toast.error(e.response?.data?.message || "Reject failed"); }
  };

  const handleDisable = async (id) => {
    try { await userAPI.disableUser(id); toast.success("User disabled"); loadUsersData(); }
    catch (e) { toast.error("Failed"); }
  };
  const handleEnable = async (id) => {
    try { await userAPI.enableUser(id); toast.success("User enabled"); loadUsersData(); }
    catch (e) { toast.error("Failed"); }
  };

  const handleConfirmSellerAction = async () => {
    if (!confirmSellerAction) return;

    try {
      if (confirmSellerAction.action === "approve") {
        await handleApprove(confirmSellerAction.id);
      } else {
        await handleReject(confirmSellerAction.id);
      }
    } finally {
      setConfirmSellerAction(null);
    }
  };

  const handleConfirmUserStatusAction = async () => {
    if (!confirmUserStatusAction) return;

    try {
      if (confirmUserStatusAction.action === "enable") {
        await handleEnable(confirmUserStatusAction.id);
      } else {
        await handleDisable(confirmUserStatusAction.id);
      }
    } finally {
      setConfirmUserStatusAction(null);
    }
  };

  const handleConfirmProductAction = async () => {
    if (!confirmProductAction) return;

    try {
      if (confirmProductAction.action === "approve") {
        await handleApproveProduct(confirmProductAction.id);
      } else {
        await handleRejectProduct(confirmProductAction.id);
      }
    } finally {
      setConfirmProductAction(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;

    try {
      await userAPI.deleteUser(confirmDeleteUser.id);
      toast.success("User deleted successfully");
      loadUsersData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete user");
    } finally {
      setConfirmDeleteUser(null);
    }
  };

  const handleApproveProduct = async (id) => {
    try {
      await productAPI.approveProduct(id);
      toast.success("Product approved successfully");
      loadProductsData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Approve failed");
    }
  };

  const handleRejectProduct = async (id) => {
    try {
      await productAPI.rejectProduct(id);
      toast.success("Product rejected successfully");
      loadProductsData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Reject failed");
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirmDeleteProduct) return;

    try {
      await productAPI.delete(confirmDeleteProduct.id);
      toast.success("Product deleted successfully");
      loadProductsData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed");
    } finally {
      setConfirmDeleteProduct(null);
    }
  };

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
      // Lazy load encryption tools and authAPI from context/api, or we can just import them at top
      // Wait, we need to import them at the top of the file.
      // Let's do the encryption inline if they are imported.
      
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

  const totalAdminOrderPages = Math.max(1, Math.ceil(orders.length / adminOrdersPerPage));
  const paginatedAdminOrders = orders.slice(
    (adminOrdersPage - 1) * adminOrdersPerPage,
    adminOrdersPage * adminOrdersPerPage
  );

  const getAdminOrderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, adminOrdersPage - 2);
    let end = Math.min(totalAdminOrderPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return pages;
  };

  const adminOrderPaginationBtn = (active = false, disabled = false) => ({
    minWidth: 38,
    height: 38,
    padding: "0 12px",
    borderRadius: 10,
    border: active ? "1px solid var(--gold)" : "1px solid #333",
    background: active ? "var(--gold)" : "#141414",
    color: active ? "#000" : disabled ? "#555" : "#ddd",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    opacity: disabled ? 0.55 : 1,
  });

  const cardStyle = (borderColor) => ({ background: "#141414", borderRadius: 16, padding: "22px 24px", borderLeft: `4px solid ${borderColor}`, borderTop: "1px solid rgba(212,175,55,0.10)", borderRight: "1px solid rgba(212,175,55,0.10)", borderBottom: "1px solid rgba(212,175,55,0.10)" });
  const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
  const thStyle = { padding: "12px 14px", textAlign: "left", color: "#999", borderBottom: "1px solid #222", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 };
  const tdStyle = { padding: "12px 14px", borderBottom: "1px solid #1a1a1a", color: "#ddd" };

  const buyerCount = users.filter(u => u.role === "buyer").length;
  const sellerCount = sellers.length;

  const validateReportDates = (showToast = true) => {
    if (!reportStartDate || !reportEndDate) {
      if (showToast) {
        toast.error("Please select start date and end date");
      }
      return false;
    }

    if (new Date(reportStartDate) > new Date(reportEndDate)) {
      if (showToast) {
        toast.error("Start date cannot be after end date");
      }
      return false;
    }

    return true;
  };

  const fetchReports = async () => {
    if (!validateReportDates(false)) {
      setReportSummary(null);
      setReportTrend([]);
      return;
    }

    try {
      setLoadingReport(true);

      const [summaryRes, trendRes] = await Promise.all([
        reportAPI.getAdminSummary(reportRange, reportStartDate, reportEndDate),
        reportAPI.getAdminSalesTrend(reportRange, reportStartDate, reportEndDate),
      ]);

      setReportSummary(summaryRes.data);
      setReportTrend(trendRes.data || []);
    } catch (err) {
      console.error("Failed to fetch reports", err);
      toast.error("Failed to load report data");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "reports") return;

    if (reportStartDate && reportEndDate) {
      if (new Date(reportStartDate) <= new Date(reportEndDate)) {
        fetchReports();
      } else {
        setReportSummary(null);
        setReportTrend([]);
      }
    } else {
      setReportSummary(null);
      setReportTrend([]);
    }
  }, [activeTab, reportRange, reportStartDate, reportEndDate]);

  const handleDownloadPDF = async () => {
    if (!validateReportDates(true)) return;

    try {
      toast.info("Generating PDF report...");

      const res = await reportAPI.downloadAdminReport(
        "pdf",
        reportRange,
        reportStartDate,
        reportEndDate
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute(
        "download",
        `admin_report_${reportRange}_${reportStartDate}_to_${reportEndDate}.pdf`
      );

      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadCSV = async () => {
    if (!validateReportDates(true)) return;

    try {
      toast.info("Generating CSV report...");

      const res = await reportAPI.downloadAdminReport(
        "csv",
        reportRange,
        reportStartDate,
        reportEndDate
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute(
        "download",
        `admin_report_${reportRange}_${reportStartDate}_to_${reportEndDate}.csv`
      );

      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      toast.success("CSV downloaded successfully");
    } catch (err) {
      console.error(err);
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
      {/* SELLERS */}
      {activeTab === "sellers" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 20 }}>Manage Sellers</h2>

          {pendingSellers.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ color: "#f59e0b", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Pending Approval ({pendingSellers.length})</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {pendingSellers.map(s => (
                  <div key={s.id} style={{ background: "#141414", borderRadius: 16, padding: 20, border: "1px solid rgba(245,158,11,0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", fontSize: 18 }}>
                        {s.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ color: "#fff", fontWeight: 600 }}>{s.name}</p>
                        <p style={{ color: "#888", fontSize: 12 }}>{s.email}</p>
                      </div>
                    </div>
                    {s.shopName && <p style={{ color: "#ccc", fontSize: 13, marginBottom: 4 }}>Shop: {s.shopName}</p>}
                    {s.shopDescription && <p style={{ color: "#888", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{s.shopDescription}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setConfirmSellerAction({ id: s.id, name: s.name, action: "approve" })} className="btn-gold" style={{ flex: 1, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><FiCheck /> Approve</button>
                      <button onClick={() => setConfirmSellerAction({ id: s.id, name: s.name, action: "reject" })} style={{ flex: 1, padding: "10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><FiX /> Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 style={{ color: "#ddd", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>All Sellers</h3>
          <div style={{ background: "#141414", borderRadius: 16, border: "1px solid rgba(212,175,55,0.10)", overflow: "auto" }}>
            <table style={tableStyle}>
              <thead><tr>
                <th style={thStyle}>Name</th><th style={thStyle}>Email</th><th style={thStyle}>Shop</th>
                <th style={thStyle}>Approved</th><th style={thStyle}>Status</th><th style={thStyle}>Joined</th><th style={thStyle}>Actions</th>
              </tr></thead>
              <tbody>
                {sellers.map(s => (
                  <tr key={s.id}>
                    <td
                      style={{
                        ...tdStyle,
                        cursor: "pointer",
                        color: "var(--gold)",
                        fontWeight: 600,
                      }}
                      onClick={() => setSelectedUserActivity(s)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {s.name}
                    </td><td style={tdStyle}>{s.email}</td><td style={tdStyle}>{s.shopName || "-"}</td>
                    <td style={tdStyle}><span style={{ color: s.approved ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>{s.approved ? "Approved" : "Pending"}</span></td>
                    <td style={tdStyle}><span style={{ color: s.active ? "#22c55e" : "#ef4444" }}>{s.active ? "Active" : "Disabled"}</span></td>
                    <td style={tdStyle}>{formatDate(s.createdAt)}</td>
                    <td style={tdStyle}>
                      {s.approved ? (
                        <button onClick={() => setConfirmSellerAction({ id: s.id, name: s.name, action: "reject" })} style={{ background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 500 }}>
                          Reject
                        </button>
                      ) : (
                        <button onClick={() => setConfirmSellerAction({ id: s.id, name: s.name, action: "approve" })} style={{ background: "rgba(34,197,94,0.15)", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#22c55e", fontSize: 12, fontWeight: 500 }}>
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sellers.length === 0 && <p style={{ textAlign: "center", padding: 32, color: "#666" }}>No sellers</p>}
          </div>
        </div>
      )}

      {/* USERS */}
      {activeTab === "users" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 20 }}>Manage Users</h2>
          <div style={{ background: "#141414", borderRadius: 16, border: "1px solid rgba(212,175,55,0.10)", overflow: "auto" }}>
            <table style={tableStyle}>
              <thead><tr>
                <th style={thStyle}>Name</th><th style={thStyle}>Email</th><th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th><th style={thStyle}>Joined</th><th style={thStyle}>Activity</th><th style={thStyle}>Actions</th>
              </tr></thead>
              <tbody>
                {users.map(u => {
                  const userOrdersCount = orders.filter(o => o.userId === u.id).length;
                  const sellerProductsCount = products.filter(p => p.sellerId === u.id).length;
                  let activityText = "-";
                  if (u.role === "buyer") {
                    activityText = `${userOrdersCount} ${userOrdersCount === 1 ? "order" : "orders"} placed`;
                  } else if (u.role === "seller") {
                    activityText = `${sellerProductsCount} ${sellerProductsCount === 1 ? "product" : "products"} uploaded`;
                  } else if (u.role === "admin") {
                    activityText = "Admin Account";
                  }

                  return (
                    <tr key={u.id}>
                      <td 
                        style={{ ...tdStyle, cursor: "pointer", color: "var(--gold)", fontWeight: 600 }} 
                        onClick={() => setSelectedUserActivity(u)}
                        onMouseEnter={e => e.target.style.textDecoration = "underline"}
                        onMouseLeave={e => e.target.style.textDecoration = "none"}
                      >
                        {u.name}
                      </td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}><span style={{ textTransform: "capitalize" }}>{u.role}</span></td>
                      <td style={tdStyle}><span style={{ color: u.active ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{u.active ? "Active" : "Disabled"}</span></td>
                      <td style={tdStyle}>{formatDate(u.createdAt)}</td>
                      <td style={tdStyle}><span style={{ fontSize: 12, color: "#aaa" }}>{activityText}</span></td>
                      <td style={tdStyle}>
                        {u.role !== "admin" && (
                          <div style={{ display: "flex", gap: 8 }}>
                            {u.active ? (
                              <button onClick={() => setConfirmUserStatusAction({ id: u.id, name: u.name, action: "disable" })} style={{ background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 500 }}>
                                Block
                              </button>
                            ) : (
                              <button onClick={() => setConfirmUserStatusAction({ id: u.id, name: u.name, action: "enable" })} style={{ background: "rgba(34,197,94,0.15)", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#22c55e", fontSize: 12, fontWeight: 500 }}>
                                Unblock
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setConfirmDeleteUser({
                                  id: u.id,
                                  name: u.name,
                                  email: u.email,
                                })
                              }
                              style={{
                                background: "rgba(239,68,68,0.15)",
                                border: "none",
                                borderRadius: 8,
                                padding: "6px 14px",
                                cursor: "pointer",
                                color: "#ef4444",
                                fontSize: 12,
                                fontWeight: 500,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      {activeTab === "products" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 20 }}>All Products</h2>
          <div style={{ background: "#141414", borderRadius: 16, border: "1px solid rgba(212,175,55,0.10)", overflow: "auto" }}>
            <table style={tableStyle}>
              <thead><tr>
                <th style={thStyle}>Image</th><th style={thStyle}>Name</th><th style={thStyle}>Category</th>
                <th style={thStyle}>Seller</th><th style={thStyle}>Price</th><th style={thStyle}>Stock</th><th style={thStyle}>Sold</th>
                <th style={thStyle}>Status</th><th style={thStyle}>Actions</th>
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id || p._id}>
                    <td style={tdStyle}><img src={p.images?.[0] || "https://via.placeholder.com/40"} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} /></td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "#fff" }}>{p.name}</td>
                    <td style={tdStyle}>{p.category}</td>
                    <td style={tdStyle}>{p.sellerShopName || p.sellerName || "-"}</td>
                    <td style={tdStyle}>{formatCurrency(p.price)}</td>
                    <td style={tdStyle}><span style={{ color: (p.stock || 0) < 10 ? "#ef4444" : "#22c55e" }}>{p.stock}</span></td>
                    <td style={tdStyle}>{p.soldQuantity || 0}</td>
                    <td style={tdStyle}>
                      <span style={{ color: p.approved ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
                        {p.approved ? "Approved" : "Pending Approval"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {!p.approved ? (
                          <button onClick={() => setConfirmProductAction({ id: p.id || p._id, name: p.name, action: "approve" })} style={{ background: "rgba(34,197,94,0.15)", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#22c55e", fontSize: 12, fontWeight: 600 }}>
                            Approve
                          </button>
                        ) : (
                          <button onClick={() => setConfirmProductAction({ id: p.id || p._id, name: p.name, action: "reject" })} style={{ background: "rgba(245,158,11,0.15)", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setConfirmDeleteProduct({
                              id: p.id || p._id,
                              name: p.name,
                            })
                          }
                          style={{
                            background: "rgba(239,68,68,0.15)",
                            border: "none",
                            borderRadius: 8,
                            padding: "6px 12px",
                            cursor: "pointer",
                            color: "#ef4444",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && <p style={{ textAlign: "center", padding: 32, color: "#666" }}>No products</p>}
          </div>
        </div>
      )}

      {/* ORDERS */}
      {activeTab === "orders" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 20 }}>All Orders</h2>
          <div style={{ background: "#141414", borderRadius: 16, border: "1px solid rgba(212,175,55,0.10)", overflow: "auto" }}>
            <table style={tableStyle}>
              <thead><tr>
                <th style={thStyle}>Order ID</th><th style={thStyle}>Buyer</th><th style={thStyle}>Payment</th>
                <th style={thStyle}>Pay Status</th><th style={thStyle}>Txn ID</th><th style={thStyle}>Order Status</th><th style={thStyle}>Total</th><th style={thStyle}>Date</th>
              </tr></thead>
              <tbody>
                {paginatedAdminOrders.map(o => (
                  <tr key={o.id}>
                    <td style={tdStyle}>{o.id?.slice(-8)}</td>
                    <td style={tdStyle}>{o.fullName || o.userName}</td>
                    <td style={tdStyle}>{o.paymentMethod}</td>
                    <td style={tdStyle}><StatusBadge status={o.paymentStatus} /></td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>{o.transactionId || "-"}</td>
                    <td style={tdStyle}><StatusBadge status={o.orderStatus} /></td>
                    <td style={tdStyle}>{formatCurrency(o.totalAmount)}</td>
                    <td style={tdStyle}>{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && <p style={{ textAlign: "center", padding: 32, color: "#666" }}>No orders</p>}
          </div>

          {orders.length > adminOrdersPerPage && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                marginTop: 24,
                width: "100%",
              }}
            >
              <p style={{ color: "#888", fontSize: 13, margin: 0, textAlign: "center" }}>
                Showing {(adminOrdersPage - 1) * adminOrdersPerPage + 1}-
                {Math.min(adminOrdersPage * adminOrdersPerPage, orders.length)} of {orders.length} orders
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  width: "100%",
                }}
              >
                <button
                  type="button"
                  disabled={adminOrdersPage === 1}
                  onClick={() => setAdminOrdersPage((p) => Math.max(1, p - 1))}
                  style={adminOrderPaginationBtn(false, adminOrdersPage === 1)}
                >
                  <FiChevronLeft size={16} /> Previous
                </button>

                {getAdminOrderPageNumbers().map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setAdminOrdersPage(page)}
                    style={adminOrderPaginationBtn(page === adminOrdersPage)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={adminOrdersPage === totalAdminOrderPages}
                  onClick={() => setAdminOrdersPage((p) => Math.min(totalAdminOrderPages, p + 1))}
                  style={adminOrderPaginationBtn(false, adminOrdersPage === totalAdminOrderPages)}
                >
                  Next <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORTS */}
      {activeTab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", margin: 0 }}>Platform Reports</h2>
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

          
          {(!reportStartDate || !reportEndDate) && (
            <div
              style={{
                padding: 14,
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 8,
              }}
            >
              <p
                style={{
                  color: "#f59e0b",
                  fontSize: 13,
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                Please select start date and end date to generate report.
              </p>
            </div>
          )}

          {reportStartDate &&
            reportEndDate &&
            new Date(reportStartDate) > new Date(reportEndDate) && (
              <div
                style={{
                  padding: 14,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 8,
                }}
              >
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: 13,
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  Start date cannot be after end date.
                </p>
              </div>
            )}

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
                  <p style={{ color: "#888", fontSize: 13, margin: "0 0 4px 0" }}>Admin: <span style={{ color: "#ccc" }}>{reportSummary.admin?.adminName || user?.name}</span></p>
                  <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Scope: <span style={{ color: "#ccc" }}>{reportSummary.platform?.scope || "All Sellers"}</span></p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#888", fontSize: 12, margin: "0 0 4px 0" }}>Generated: {reportSummary.generatedAt}</p>
                  <p style={{ color: "#888", fontSize: 12, margin: 0 }}>Range: {reportSummary.dateRange.startDate} to {reportSummary.dateRange.endDate}</p>
                </div>
              </div>

              {/* Report Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 16, marginBottom: 24 }}>
                {[
                  { label: "Platform Revenue", value: formatCurrency(reportSummary.summary.totalPlatformRevenue), color: "#d4af37" },
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
              </div>



              {/* Charts */}
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
                          <Line type="monotone" dataKey="totalSales" name="Platform Revenue" stroke="#d4af37" strokeWidth={3} dot={{ r: 4, fill: "#111", stroke: "#d4af37", strokeWidth: 2 }} activeDot={{ r: 6 }} />
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

      {/* REVIEWS */}
      {activeTab === "reviews" && (
        <AdminReviews />
      )}

      {/* REFUNDS */}
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
                    <th style={thStyle}>Items & Sellers</th>
                    <th style={thStyle}>Total Amount</th>
                    <th style={thStyle}>Refund Reason</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {refundRequests.map(r => {
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
                          {r.items?.map((item, idx) => (
                            <div key={idx} style={{ fontSize: 12, color: "#ccc", marginBottom: 4 }}>
                              {item.productName} (x{item.quantity})
                              <span style={{ display: "block", fontSize: 10, color: "#888" }}>
                                Seller: {item.sellerShopName || item.sellerName || "Shop ID: " + item.sellerId}
                              </span>
                            </div>
                          ))}
                        </td>
                        <td style={tdStyle}>{formatCurrency(r.totalAmount)}</td>
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

      {/* PROFILE */}
      {activeTab === "profile" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--gold)", margin: 0 }}>Admin Profile</h2>
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
                <span style={{ display: "inline-block", marginTop: 6, padding: "3px 12px", borderRadius: 20, background: "#d4af37", color: "#000", fontSize: 11, fontWeight: 700 }}>Administrator</span>
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

      {/* Activity Log Modal */}
      {selectedUserActivity && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedUserActivity(null)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000
          }}
        >
          <div 
            className="auth-box animate-slideUp" 
            onClick={e => e.stopPropagation()}
            style={{
              background: "#141414",
              border: "1px solid var(--gold)",
              borderRadius: 16,
              padding: 28,
              width: "90%",
              maxWidth: 650,
              maxHeight: "85vh",
              overflowY: "auto",
              position: "relative",
              color: "#fff"
            }}
          >
            <button 
              onClick={() => setSelectedUserActivity(null)}
              style={{
                position: "absolute",
                top: 20, right: 20,
                background: "transparent",
                border: "none",
                color: "#999",
                cursor: "pointer"
              }}
            >
              <FiX size={24} />
            </button>

            <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: 20, marginBottom: 6 }}>
              User Details
            </h3>

            <div
              style={{
                background: "#0d0d0d",
                border: "1px solid rgba(212,175,55,0.12)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <p style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {selectedUserActivity.name}
              </p>

              <p style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>
                Email: <span style={{ color: "#ddd" }}>{selectedUserActivity.email}</span>
              </p>

              <p style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>
                Role: {" "}
                <span
                  style={{
                    color: "var(--gold)",
                    textTransform: "capitalize",
                    fontWeight: 600,
                  }}
                >
                  {selectedUserActivity.role}
                </span>
              </p>

              {selectedUserActivity.role === "seller" && (
                <>
                  <p style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>
                    Shop: <span style={{ color: "#ddd" }}>{selectedUserActivity.shopName || "-"}</span>
                  </p>

                  <p style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>
                    Approval: {" "}
                    <span
                      style={{
                        color: selectedUserActivity.approved ? "#22c55e" : "#f59e0b",
                        fontWeight: 600,
                      }}
                    >
                      {selectedUserActivity.approved ? "Approved" : "Pending"}
                    </span>
                  </p>
                </>
              )}

              <p style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>
                Status: {" "}
                <span
                  style={{
                    color: selectedUserActivity.active ? "#22c55e" : "#ef4444",
                    fontWeight: 600,
                  }}
                >
                  {selectedUserActivity.active ? "Active" : "Disabled"}
                </span>
              </p>

              <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>
                Joined: <span style={{ color: "#ddd" }}>{formatDate(selectedUserActivity.createdAt)}</span>
              </p>
            </div>

            <div style={{ marginTop: 16 }}>
              {selectedUserActivity.role === "buyer" && (() => {
                const userOrders = orders.filter(o => o.userId === selectedUserActivity.id);
                return (
                  <div>
                    <h4 style={{ color: "#fff", borderBottom: "1px solid #222", paddingBottom: 8, marginBottom: 12 }}>
                      Order History ({userOrders.length} {userOrders.length === 1 ? "order" : "orders"})
                    </h4>
                    {userOrders.length === 0 ? (
                      <p style={{ color: "#666", fontSize: 13 }}>No orders placed yet.</p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #222", color: "#888", textAlign: "left" }}>
                              <th style={{ padding: "8px 4px" }}>Order ID</th>
                              <th style={{ padding: "8px 4px" }}>Date</th>
                              <th style={{ padding: "8px 4px" }}>Status</th>
                              <th style={{ padding: "8px 4px", textAlign: "right" }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userOrders.map(o => (
                              <tr key={o.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                                <td style={{ padding: "8px 4px", color: "#ddd" }}>{o.id?.slice(-8).toUpperCase()}</td>
                                <td style={{ padding: "8px 4px", color: "#ccc" }}>{formatDate(o.createdAt)}</td>
                                <td style={{ padding: "8px 4px" }}><StatusBadge status={o.orderStatus} /></td>
                                <td style={{ padding: "8px 4px", textAlign: "right", color: "var(--gold)", fontWeight: 600 }}>{formatCurrency(o.totalAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedUserActivity.role === "seller" && (() => {
                const sellerProducts = products.filter(p => p.sellerId === selectedUserActivity.id);
                return (
                  <div>
                    <h4 style={{ color: "#fff", borderBottom: "1px solid #222", paddingBottom: 8, marginBottom: 12 }}>
                      Uploaded Products ({sellerProducts.length} {sellerProducts.length === 1 ? "product" : "products"})
                    </h4>
                    {sellerProducts.length === 0 ? (
                      <p style={{ color: "#666", fontSize: 13 }}>No products uploaded yet.</p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #222", color: "#888", textAlign: "left" }}>
                              <th style={{ padding: "8px 4px" }}>Image</th>
                              <th style={{ padding: "8px 4px" }}>Name</th>
                              <th style={{ padding: "8px 4px" }}>Stock</th>
                              <th style={{ padding: "8px 4px" }}>Status</th>
                              <th style={{ padding: "8px 4px", textAlign: "right" }}>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sellerProducts.map(p => (
                              <tr key={p.id || p._id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                                <td style={{ padding: "8px 4px" }}>
                                  <img 
                                    src={p.images?.[0] || "https://via.placeholder.com/30"} 
                                    alt="" 
                                    style={{ width: 30, height: 30, borderRadius: 4, objectFit: "cover" }} 
                                  />
                                </td>
                                <td style={{ padding: "8px 4px", color: "#ddd", fontWeight: 500 }}>{p.name}</td>
                                <td style={{ padding: "8px 4px", color: "#ccc" }}>{p.stock}</td>
                                <td style={{ padding: "8px 4px" }}>
                                  <span style={{ color: p.approved ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
                                    {p.approved ? "Approved" : "Pending"}
                                  </span>
                                </td>
                                <td style={{ padding: "8px 4px", textAlign: "right", color: "var(--gold)", fontWeight: 600 }}>{formatCurrency(p.price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedUserActivity.role === "admin" && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#888" }}>
                  <FiShield size={36} style={{ color: "var(--gold)", marginBottom: 12 }} />
                  <p>Admin accounts do not track catalog upload or purchase transaction histories.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      <ConfirmModal
        isOpen={!!confirmSellerAction}
        title={confirmSellerAction?.action === "approve" ? "Approve Seller" : "Reject Seller"}
        message={`Are you sure you want to ${
          confirmSellerAction?.action === "approve" ? "approve" : "reject"
        } ${confirmSellerAction?.name || "this seller"}?`}
        confirmText={confirmSellerAction?.action === "approve" ? "Approve Seller" : "Reject Seller"}
        cancelText="Cancel"
        type={confirmSellerAction?.action === "approve" ? "success" : "danger"}
        onConfirm={handleConfirmSellerAction}
        onCancel={() => setConfirmSellerAction(null)}
      />

      <ConfirmModal
        isOpen={!!confirmUserStatusAction}
        title={confirmUserStatusAction?.action === "enable" ? "Unblock User" : "Block User"}
        message={`Are you sure you want to ${
          confirmUserStatusAction?.action === "enable" ? "unblock" : "block"
        } ${confirmUserStatusAction?.name || "this user"}?`}
        confirmText={confirmUserStatusAction?.action === "enable" ? "Unblock User" : "Block User"}
        cancelText="Cancel"
        type={confirmUserStatusAction?.action === "enable" ? "success" : "danger"}
        onConfirm={handleConfirmUserStatusAction}
        onCancel={() => setConfirmUserStatusAction(null)}
      />

      <ConfirmModal
        isOpen={!!confirmProductAction}
        title={confirmProductAction?.action === "approve" ? "Approve Product" : "Reject Product"}
        message={`Are you sure you want to ${
          confirmProductAction?.action === "approve" ? "approve" : "reject"
        } ${confirmProductAction?.name || "this product"}?`}
        confirmText={confirmProductAction?.action === "approve" ? "Approve Product" : "Reject Product"}
        cancelText="Cancel"
        type={confirmProductAction?.action === "approve" ? "success" : "danger"}
        onConfirm={handleConfirmProductAction}
        onCancel={() => setConfirmProductAction(null)}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${
          confirmDeleteUser?.name || "this user"
        }? This action cannot be undone.`}
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteUser}
        onCancel={() => setConfirmDeleteUser(null)}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete ${
          confirmDeleteProduct?.name || "this product"
        }? This action cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteProduct}
        onCancel={() => setConfirmDeleteProduct(null)}
      />
    </DashboardLayout>
  );
};

export default AdminDashboard;