import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import {
  FiShoppingCart,
  FiUser,
  FiMenu,
  FiX,
  FiSearch,
  FiLogOut,
  FiGrid,
  FiSettings,
  FiChevronDown,
  FiHeart,
  FiShoppingBag,
} from "react-icons/fi";

import AuthModal from "./AuthModal";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { wishlistCount } = useWishlist();

  const navigate = useNavigate();
  const location = useLocation();
  const { info } = useToast();

  const dropdownRef = useRef(null);
  const handledLoginPromptRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [authModal, setAuthModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (location.state?.openLogin && !user && !handledLoginPromptRef.current) {
      handledLoginPromptRef.current = true;

      setAuthModal("login");

      if (location.state.message) {
        info(location.state.message);
      }

      navigate(location.pathname + location.search, {
        replace: true,
        state: {},
      });
    }

    if (!location.state?.openLogin) {
      handledLoginPromptRef.current = false;
    }
  }, [
    location.state,
    location.pathname,
    location.search,
    user,
    navigate,
    info,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showUserMenu]);

  const dashboardPath =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "seller"
      ? "/seller"
      : "/buyer?tab=orders";

  const profilePath =
    user?.role === "admin"
      ? "/admin?tab=profile"
      : user?.role === "seller"
      ? "/seller?tab=profile"
      : "/buyer?tab=profile";

  const settingsPath =
    user?.role === "admin"
      ? "/admin?tab=settings"
      : user?.role === "seller"
      ? "/seller?tab=settings"
      : "/buyer?tab=settings";

  const closeMenus = () => {
    setShowUserMenu(false);
    setMenuOpen(false);
  };

  const handleSearch = (event) => {
    event.preventDefault();

    if (!searchTerm.trim()) return;

    navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    closeMenus();
  };

  const handleLogout = () => {
    logout();
    closeMenus();
    setAuthModal(null);
    navigate("/", { replace: true, state: {} });
  };

  const getUserInitial = () => {
    if (!user?.name) return "?";
    return user.name.charAt(0).toUpperCase();
  };

  const getRoleLabel = () => {
    if (user?.role === "admin") return "Administrator";
    if (user?.role === "seller") return "Seller";
    return "Buyer";
  };

  const getRoleBadgeStyle = () => {
    if (user?.role === "admin") return { bg: "#d4af37", color: "#000" };
    if (user?.role === "seller") return { bg: "#22c55e", color: "#fff" };
    return { bg: "#3b82f6", color: "#fff" };
  };

  const roleBadge = getRoleBadgeStyle();

  return (
    <>
      <nav className="navbar">
        <Link
          to={
            user?.role === "seller"
              ? "/seller"
              : user?.role === "admin"
              ? "/admin"
              : "/"
          }
          className="logo-wrapper"
          onClick={closeMenus}
        >
          <h1 className="logo-main">HERITCRAFT</h1>
          <p className="logo-sub">Where Heritage Meets Creativity</p>
        </Link>

        {(!user || user.role === "buyer") && (
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for handmade products..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <button type="submit" className="search-btn">
              <FiSearch size={28} />
            </button>
          </form>
        )}

        <div className="nav-links hidden lg:flex">
          {(!user || user.role === "buyer") && (
            <>
              <Link to="/" onClick={closeMenus}>
                Home
              </Link>

              <Link to="/products" onClick={closeMenus}>
                Products
              </Link>
            </>
          )}

          {!user ? (
            <div className="auth-buttons">
              <button
                onClick={() => {
                  setAuthModal("login");
                  closeMenus();
                }}
                className="buyer-btn"
              >
                Login
              </button>

              <button
                onClick={() => {
                  setAuthModal("signup");
                  closeMenus();
                }}
                className="seller-btn"
              >
                Signup
              </button>
            </div>
          ) : (
            <div
              ref={dropdownRef}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <button
                onClick={() => setShowUserMenu((prev) => !prev)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: showUserMenu
                    ? "rgba(212,175,55,0.08)"
                    : "none",
                  border: "1px solid transparent",
                  borderColor: showUserMenu
                    ? "rgba(212,175,55,0.2)"
                    : "transparent",
                  borderRadius: 12,
                  padding: "6px 12px 6px 6px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user?.name}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #d4af37",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #d4af37, #b8860b)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#000",
                      fontWeight: "bold",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {getUserInitial()}
                  </div>
                )}

                <span
                  style={{
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    maxWidth: 120,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name}
                </span>

                <FiChevronDown
                  size={14}
                  style={{
                    color: "#888",
                    transition: "transform 0.2s",
                    transform: showUserMenu ? "rotate(180deg)" : "rotate(0)",
                  }}
                />
              </button>

              {showUserMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: 260,
                    background: "#141414",
                    border: "1px solid rgba(212,175,55,0.2)",
                    borderRadius: 16,
                    padding: 0,
                    boxShadow:
                      "0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(212,175,55,0.06)",
                    zIndex: 100,
                    overflow: "hidden",
                    animation: "dropdownSlideIn 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      padding: "18px 18px 14px",
                      borderBottom: "1px solid rgba(212,175,55,0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.name}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid #d4af37",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #d4af37, #b8860b)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#000",
                          fontWeight: "bold",
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {getUserInitial()}
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 14,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginBottom: 2,
                        }}
                      >
                        {user.name}
                      </p>

                      <p
                        style={{
                          color: "#888",
                          fontSize: 11,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginBottom: 4,
                        }}
                      >
                        {user.email}
                      </p>

                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          background: roleBadge.bg,
                          color: roleBadge.color,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                        }}
                      >
                        {getRoleLabel()}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: "6px 0" }}>
                    {[
                      {
                        icon:
                          user?.role === "buyer" ? (
                            <FiShoppingBag size={15} />
                          ) : (
                            <FiGrid size={15} />
                          ),
                        label:
                          user?.role === "buyer" ? "My Orders" : "Dashboard",
                        action: () => {
                          navigate(
                            user?.role === "buyer"
                              ? "/buyer?tab=orders"
                              : dashboardPath
                          );
                          closeMenus();
                        },
                      },
                      {
                        icon: <FiUser size={15} />,
                        label: "Profile",
                        action: () => {
                          navigate(profilePath);
                          closeMenus();
                        },
                      },
                      {
                        icon: <FiSettings size={15} />,
                        label: "Settings",
                        action: () => {
                          navigate(settingsPath);
                          closeMenus();
                        },
                      },
                    ].map((item, index) => (
                      <button
                        key={index}
                        onClick={item.action}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                          padding: "11px 18px",
                          background: "none",
                          border: "none",
                          color: "#ccc",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.background =
                            "rgba(212,175,55,0.06)";
                          event.currentTarget.style.color = "#d4af37";
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.background = "none";
                          event.currentTarget.style.color = "#ccc";
                        }}
                      >
                        <span style={{ display: "flex", opacity: 0.7 }}>
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid rgba(212,175,55,0.1)",
                      padding: "6px 0",
                    }}
                  >
                    <button
                      onClick={handleLogout}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        padding: "11px 18px",
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background =
                          "rgba(239,68,68,0.06)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "none";
                      }}
                    >
                      <FiLogOut size={15} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(!user || user.role === "buyer") && (
            <Link
              to="/wishlist"
              onClick={closeMenus}
              className="cart-icon-btn"
              style={{ position: "relative" }}
            >
              <FiHeart size={30} />
              {wishlistCount > 0 && (
                <span className="cart-count">{wishlistCount}</span>
              )}
            </Link>
          )}

          {(!user || user.role === "buyer") && (
            <Link to="/cart" onClick={closeMenus} className="cart-icon-btn">
              <FiShoppingCart size={34} />
              {totalItems > 0 && (
                <span className="cart-count">{totalItems}</span>
              )}
            </Link>
          )}
        </div>

        <button
          className="lg:hidden text-white"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <FiX size={32} /> : <FiMenu size={32} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="lg:hidden panel mx-5 mt-3 space-y-4">
          {(!user || user.role === "buyer") && (
            <>
              <Link to="/" onClick={closeMenus} className="block">
                Home
              </Link>

              <Link to="/#categories" onClick={closeMenus} className="block">
                Categories
              </Link>

              <Link to="/products" onClick={closeMenus} className="block">
                Products
              </Link>
            </>
          )}

          {!user ? (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setAuthModal("login");
                  closeMenus();
                }}
                className="buyer-btn w-full"
              >
                Login
              </button>

              <button
                onClick={() => {
                  setAuthModal("signup");
                  closeMenus();
                }}
                className="seller-btn w-full"
              >
                Signup
              </button>
            </div>
          ) : (
            <>
              <Link
                to={
                  user?.role === "buyer" ? "/buyer?tab=orders" : dashboardPath
                }
                onClick={closeMenus}
                className="block py-2 hover:text-[var(--gold)]"
              >
                {user?.role === "buyer" ? "My Orders" : "Dashboard"}
              </Link>

              <Link
                to={profilePath}
                onClick={closeMenus}
                className="block py-2 hover:text-[var(--gold)]"
              >
                Profile
              </Link>

              <Link
                to={settingsPath}
                onClick={closeMenus}
                className="block py-2 hover:text-[var(--gold)]"
              >
                Settings
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 py-2 text-red-400"
              >
                <FiLogOut size={14} /> Logout
              </button>
            </>
          )}
        </div>
      )}

      {authModal && (
        <AuthModal mode={authModal} onClose={() => setAuthModal(null)} />
      )}

      <style>{`
        @keyframes dropdownSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default Navbar;