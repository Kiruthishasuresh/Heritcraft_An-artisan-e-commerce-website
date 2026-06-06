import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { useState } from "react";

const DashboardLayout = ({ tabs, activeTab, onTabChange, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getUserInitial = () => {
    if (!user?.name) return "?";
    return user.name.charAt(0).toUpperCase();
  };

  const getRoleBadge = () => {
    if (user?.role === "admin") return { text: "Admin", bg: "#d4af37", color: "#000" };
    if (user?.role === "seller" && user?.approved) return { text: "Approved Seller", bg: "#22c55e", color: "#fff" };
    if (user?.role === "seller") return { text: "Pending Approval", bg: "#f59e0b", color: "#000" };
    return { text: "Buyer", bg: "#3b82f6", color: "#fff" };
  };

  const badge = getRoleBadge();

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", background: "#050505", overflow: "hidden", position: "relative" }}>
      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div className="dashboard-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`dashboard-sidebar-container ${mobileMenuOpen ? "open" : ""}`}>
        {/* Profile */}
        <div style={{ padding: "28px 20px 18px", borderBottom: "1px solid rgba(212,175,55,0.10)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user?.name}
                style={{
                  width: 48, height: 48, borderRadius: "50%",
                  objectFit: "cover", flexShrink: 0,
                  border: "2px solid #d4af37",
                }}
              />
            ) : (
              <div
                style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "linear-gradient(135deg, #d4af37, #b8860b)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#000", fontWeight: "bold", fontSize: 20, flexShrink: 0,
                }}
              >
                {getUserInitial()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: "#fff", fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.name}
              </p>
              <p style={{ color: "#888", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.email}
              </p>
            </div>
          </div>
          {user?.role === "seller" && user?.shopName && (
            <p style={{ color: "#aaa", fontSize: 12, marginBottom: 6 }}>{user.shopName}</p>
          )}
          <span
            style={{
              display: "inline-block", padding: "3px 12px", borderRadius: 20,
              background: badge.bg, color: badge.color,
              fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
            }}
          >
            {badge.text}
          </span>
          <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
            <FiX />
          </button>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, minHeight: 0, padding: "12px 0", overflowY: "auto", overflowX: "hidden" }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  onTabChange(tab.key);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: "12px 24px",
                  background: isActive ? "rgba(212,175,55,0.08)" : "transparent",
                  borderLeft: isActive ? "3px solid #d4af37" : "3px solid transparent",
                  borderTop: "none", borderRight: "none", borderBottom: "none",
                  color: isActive ? "#d4af37" : "#999",
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  cursor: "pointer", textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                {tab.icon && <span style={{ fontSize: 18, display: "flex" }}>{tab.icon}</span>}
                <span style={{ flex: 1 }}>{tab.label}</span>
                {tab.badge > 0 && (
                  <span style={{
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: "50%",
                    minWidth: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "0 4px",
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: "32px", minWidth: 0, overflowY: "auto", paddingBottom: 60 }}>
        {/* Mobile Header Bar */}
        <div className="dashboard-mobile-header">
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              background: "none",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 8,
              color: "#d4af37",
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FiMenu size={16} /> Menu
          </button>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
            {tabs.find((t) => t.key === activeTab)?.label || "Dashboard"}
          </span>
        </div>

        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
