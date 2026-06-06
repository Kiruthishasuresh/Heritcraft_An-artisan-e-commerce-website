import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

const HomePage = lazy(() => import("./pages/HomePage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const BuyerDashboard = lazy(() => import("./dashboards/BuyerDashboard"));
const SellerDashboard = lazy(() => import("./dashboards/SellerDashboard"));
const AdminDashboard = lazy(() => import("./dashboards/AdminDashboard"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));

const PageLoader = () => (
  <div className="min-h-[70vh] flex items-center justify-center">
    <div className="w-16 h-16 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
  </div>
);

const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
    <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "4rem", color: "var(--gold)" }}>
      404
    </h1>
    <p className="text-gray-400 text-lg">Page not found</p>
    <a href="/" className="btn-gold px-8 py-3">
      Back to Home
    </a>
  </div>
);

const PublicBuyerRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "seller") return <Navigate to="/seller" replace />;
  }
  return children;
};

function App() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-[var(--black)] text-white">
      <Navbar />

      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PublicBuyerRoute><HomePage /></PublicBuyerRoute>} />

            <Route path="/products" element={<PublicBuyerRoute><ProductsPage /></PublicBuyerRoute>} />

            <Route path="/products/:id" element={<PublicBuyerRoute><ProductDetailPage /></PublicBuyerRoute>} />

            <Route
              path="/cart"
              element={
                <CartPage />
              }
            />

            <Route path="/wishlist" element={<WishlistPage />} />

            <Route
              path="/checkout"
              element={
                <ProtectedRoute roles={["buyer"]}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/buyer/*"
              element={
                <ProtectedRoute roles={["buyer"]}>
                  <BuyerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/seller/*"
              element={
                <ProtectedRoute roles={["seller"]}>
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/*"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {(!user || user.role === "buyer") && <Footer />}
    </div>
  );
}

export default App;