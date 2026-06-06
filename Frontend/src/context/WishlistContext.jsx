import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { useToast } from "./ToastContext";
import { wishlistAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

const STORAGE_KEY = "heritcraft_wishlist";

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const toast = useToast();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState(null);

  const wishlistCount = wishlistItems.length;

  const isBuyer = user && user.role === "buyer";
  const isGuest = !user;
  const isSellerOrAdmin = user && (user.role === "seller" || user.role === "admin");

  // ── Guest helpers (localStorage) ──────────────────────────────
  const loadGuestWishlist = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const items = saved ? JSON.parse(saved) : [];
      setWishlistItems(items);
    } catch {
      setWishlistItems([]);
    }
  }, []);

  const saveGuestWishlist = useCallback((items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setWishlistItems(items);
  }, []);

  // ── Buyer helpers (API) ───────────────────────────────────────
  const fetchWishlist = useCallback(async () => {
    setWishlistLoading(true);
    setWishlistError(null);
    try {
      const res = await wishlistAPI.get();
      setWishlistItems(res.data.items || []);
    } catch (err) {
      console.error("Wishlist fetch error:", err);
      setWishlistError(err.response?.data?.message || "Failed to fetch wishlist");
    } finally {
      setWishlistLoading(false);
    }
  }, []);

  const mergeLocalWishlistToBackend = useCallback(async () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const localItems = JSON.parse(saved);
      if (localItems && localItems.length > 0) {
        const productIds = localItems.map((item) => item.productId).filter(Boolean);
        if (productIds.length > 0) {
          await wishlistAPI.merge(productIds.map((id) => ({ productId: id })));
        }
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Wishlist merge error:", err);
    }
  }, []);

  // ── Public API ────────────────────────────────────────────────
  const addToWishlist = useCallback(
    async (product) => {
      if (isSellerOrAdmin) return;

      const productId = product.id || product._id;

      if (isBuyer) {
        try {
          await wishlistAPI.add(productId);
          await fetchWishlist();
          toast.success("Added to wishlist");
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to add to wishlist");
        }
      } else {
        // Guest
        const newItem = {
          productId,
          productName: product.name,
          image: product.images?.[0] || "",
          price: product.price,
          sellerId: product.sellerId,
          sellerName: product.sellerName || product.seller?.name,
          sellerShopName: product.sellerShopName || product.seller?.shopName,
          stock: product.stock,
          addedAt: new Date().toISOString(),
        };
        const updated = [...wishlistItems, newItem];
        saveGuestWishlist(updated);
        toast.success("Added to wishlist");
      }
    },
    [isSellerOrAdmin, isBuyer, wishlistItems, fetchWishlist, saveGuestWishlist, toast]
  );

  const removeFromWishlist = useCallback(
    async (productId) => {
      if (isSellerOrAdmin) return;

      if (isBuyer) {
        try {
          await wishlistAPI.remove(productId);
          await fetchWishlist();
          toast.success("Removed from wishlist");
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to remove from wishlist");
        }
      } else {
        const updated = wishlistItems.filter((item) => item.productId !== productId);
        saveGuestWishlist(updated);
        toast.success("Removed from wishlist");
      }
    },
    [isSellerOrAdmin, isBuyer, wishlistItems, fetchWishlist, saveGuestWishlist, toast]
  );

  const clearWishlist = useCallback(async () => {
    if (isSellerOrAdmin) return;

    if (isBuyer) {
      try {
        await wishlistAPI.clear();
        setWishlistItems([]);
        toast.success("Wishlist cleared");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to clear wishlist");
      }
    } else {
      saveGuestWishlist([]);
      toast.success("Wishlist cleared");
    }
  }, [isSellerOrAdmin, isBuyer, saveGuestWishlist, toast]);

  const isInWishlist = useCallback(
    (productId) => {
      return wishlistItems.some((item) => item.productId === productId);
    },
    [wishlistItems]
  );

  const toggleWishlist = useCallback(
    async (product) => {
      if (isSellerOrAdmin) return;
      const productId = product.id || product._id;
      if (isInWishlist(productId)) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(product);
      }
    },
    [isSellerOrAdmin, isInWishlist, removeFromWishlist, addToWishlist]
  );

  const moveToCartHandler = useCallback(
    async (product, navigate) => {
      if (isSellerOrAdmin) return;

      const productId = product.productId || product.id || product._id;

      // If the product has variant options, navigate to detail page instead
      const hasOptions =
        (product.sizes && product.sizes.length > 0) ||
        (product.weights && product.weights.length > 0) ||
        (product.lengths && product.lengths.length > 0) ||
        (product.volumes && product.volumes.length > 0) ||
        (product.quantities && product.quantities.length > 0);

      if (hasOptions) {
        navigate(`/products/${productId}`);
        return;
      }

      addToCart(
        productId,
        1,
        {
          _id: productId,
          id: productId,
          name: product.productName || product.name,
          price: product.price,
          images: product.image ? [product.image] : product.images || [],
          sellerId: product.sellerId,
          sellerName: product.sellerName,
          sellerShopName: product.sellerShopName,
          stock: product.stock,
        },
        {}
      );
      await removeFromWishlist(productId);
      toast.success("Moved to cart");
    },
    [isSellerOrAdmin, addToCart, removeFromWishlist, toast]
  );

  // ── Sync on user change ───────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (isSellerOrAdmin) {
        setWishlistItems([]);
        return;
      }
      if (isBuyer) {
        await mergeLocalWishlistToBackend();
        await fetchWishlist();
        return;
      }
      // Guest
      loadGuestWishlist();
    };
    init();
  }, [user, isBuyer, isSellerOrAdmin, mergeLocalWishlistToBackend, fetchWishlist, loadGuestWishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        wishlistLoading,
        wishlistError,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        isInWishlist,
        toggleWishlist,
        moveToCart: moveToCartHandler,
        fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
