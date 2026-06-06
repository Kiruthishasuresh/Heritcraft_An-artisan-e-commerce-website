import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { cartAPI } from "../services/api";
import {
  getProductId,
  getSelectedOptions,
  isSameCartItem,
  calculateCartTotals,
  normalizeCartItem,
  validateCartQuantity
} from "../utils/cartUtils";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();

  const [cart, setCart] = useState({ items: [] });
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const isBuyer = user && user.role === "buyer";
  const isSellerOrAdmin = user && (user.role === "seller" || user.role === "admin");

  const updateTotals = useCallback((items) => {
    const { totalItems: count, totalPrice: price } = calculateCartTotals(items);
    setTotalItems(count);
    setTotalPrice(price);
  }, []);

  const fetchCart = useCallback(async () => {
    if (isSellerOrAdmin) {
      setCart({ items: [] });
      setCartItems([]);
      setTotalItems(0);
      setTotalPrice(0);
      setCartError(null);
      return;
    }

    setCartLoading(true);
    setCartError(null);
    try {
      if (isBuyer) {
        const response = await cartAPI.get();
        const dbCart = response.data;
        const normalized = (dbCart.items || []).map(normalizeCartItem);
        setCart({ ...dbCart, items: normalized });
        setCartItems(normalized);
        setTotalItems(dbCart.totalItems !== undefined ? dbCart.totalItems : calculateCartTotals(normalized).totalItems);
        setTotalPrice(dbCart.totalPrice !== undefined ? dbCart.totalPrice : calculateCartTotals(normalized).totalPrice);
      } else {
        const saved = localStorage.getItem("heritcraft_cart");
        const items = saved ? JSON.parse(saved) : [];
        const normalized = items.map(normalizeCartItem);
        setCart({ items: normalized });
        setCartItems(normalized);
        updateTotals(normalized);
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
      setCartError(err.response?.data?.message || "Failed to fetch cart");
    } finally {
      setCartLoading(false);
    }
  }, [isBuyer, isSellerOrAdmin, updateTotals]);

  const mergeLocalCartToBackend = useCallback(async () => {
    if (!isBuyer) return;
    const saved = localStorage.getItem("heritcraft_cart");
    if (!saved) {
      await fetchCart();
      return;
    }

    setCartLoading(true);
    setCartError(null);
    try {
      const localItems = JSON.parse(saved);
      if (localItems && localItems.length > 0) {
        const payload = localItems.map(item => ({
          productId: getProductId(item),
          quantity: item.quantity,
          ...getSelectedOptions(item)
        }));
        const response = await cartAPI.merge(payload);
        const dbCart = response.data;
        const normalized = (dbCart.items || []).map(normalizeCartItem);
        setCart({ ...dbCart, items: normalized });
        setCartItems(normalized);
        setTotalItems(dbCart.totalItems !== undefined ? dbCart.totalItems : calculateCartTotals(normalized).totalItems);
        setTotalPrice(dbCart.totalPrice !== undefined ? dbCart.totalPrice : calculateCartTotals(normalized).totalPrice);
      }
      localStorage.removeItem("heritcraft_cart");
    } catch (err) {
      console.error("Error merging cart:", err);
      setCartError(err.response?.data?.message || "Failed to merge local cart");
      // If merge fails, still fetch cart from backend
      await fetchCart();
    } finally {
      setCartLoading(false);
    }
  }, [isBuyer, fetchCart]);

  useEffect(() => {
    const initializeCart = async () => {
      if (isBuyer) {
        const saved = localStorage.getItem("heritcraft_cart");
        if (saved && JSON.parse(saved).length > 0) {
          await mergeLocalCartToBackend();
        } else {
          await fetchCart();
        }
      } else {
        await fetchCart();
      }
    };
    initializeCart();
  }, [user, isBuyer, mergeLocalCartToBackend, fetchCart]);

  const addToCart = async (productId, quantity = 1, productData = null, selectedOptions = {}) => {
    if (isSellerOrAdmin) return { success: false, error: "Sellers and Admins cannot add items to cart" };

    const opts = getSelectedOptions(selectedOptions);

    if (isBuyer) {
      setCartLoading(true);
      setCartError(null);
      try {
        const payload = {
          productId,
          quantity,
          ...opts
        };
        const response = await cartAPI.add(payload);
        const dbCart = response.data;
        const normalized = (dbCart.items || []).map(normalizeCartItem);
        setCart({ ...dbCart, items: normalized });
        setCartItems(normalized);
        setTotalItems(dbCart.totalItems !== undefined ? dbCart.totalItems : calculateCartTotals(normalized).totalItems);
        setTotalPrice(dbCart.totalPrice !== undefined ? dbCart.totalPrice : calculateCartTotals(normalized).totalPrice);
        return { success: true };
      } catch (err) {
        const errMsg = err.response?.data?.message || "Failed to add to cart";
        setCartError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setCartLoading(false);
      }
    } else {
      // Guest
      const newItem = {
        productId,
        product: productData,
        quantity,
        ...opts
      };

      const existingIndex = cartItems.findIndex(item => isSameCartItem(item, newItem));
      let updatedItems = [...cartItems];

      if (existingIndex > -1) {
        const existingItem = updatedItems[existingIndex];
        const newQty = validateCartQuantity(existingItem.quantity + quantity, productData?.stock);
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: newQty
        };
      } else {
        const newQty = validateCartQuantity(quantity, productData?.stock);
        newItem.quantity = newQty;
        updatedItems.push(newItem);
      }

      localStorage.setItem("heritcraft_cart", JSON.stringify(updatedItems));
      const normalized = updatedItems.map(normalizeCartItem);
      setCart({ items: normalized });
      setCartItems(normalized);
      updateTotals(normalized);
      return { success: true };
    }
  };

  const updateCartItem = async (productId, quantity, selectedOptions = {}) => {
    if (isSellerOrAdmin) return;

    const opts = getSelectedOptions(selectedOptions);

    if (isBuyer) {
      setCartLoading(true);
      setCartError(null);
      try {
        const payload = {
          productId,
          quantity,
          ...opts
        };
        const response = await cartAPI.update(payload);
        const dbCart = response.data;
        const normalized = (dbCart.items || []).map(normalizeCartItem);
        setCart({ ...dbCart, items: normalized });
        setCartItems(normalized);
        setTotalItems(dbCart.totalItems !== undefined ? dbCart.totalItems : calculateCartTotals(normalized).totalItems);
        setTotalPrice(dbCart.totalPrice !== undefined ? dbCart.totalPrice : calculateCartTotals(normalized).totalPrice);
      } catch (err) {
        setCartError(err.response?.data?.message || "Failed to update quantity");
      } finally {
        setCartLoading(false);
      }
    } else {
      const target = { productId, ...opts };
      const updatedItems = cartItems.map(item => {
        if (isSameCartItem(item, target)) {
          const newQty = validateCartQuantity(quantity, item.product?.stock);
          return { ...item, quantity: newQty };
        }
        return item;
      });

      localStorage.setItem("heritcraft_cart", JSON.stringify(updatedItems));
      const normalized = updatedItems.map(normalizeCartItem);
      setCart({ items: normalized });
      setCartItems(normalized);
      updateTotals(normalized);
    }
  };

  const increaseQuantity = async (productId, selectedOptions = {}) => {
    const opts = getSelectedOptions(selectedOptions);
    const target = { productId, ...opts };
    const item = cartItems.find(item => isSameCartItem(item, target));
    if (item) {
      await updateCartItem(productId, item.quantity + 1, opts);
    }
  };

  const decreaseQuantity = async (productId, selectedOptions = {}) => {
    const opts = getSelectedOptions(selectedOptions);
    const target = { productId, ...opts };
    const item = cartItems.find(item => isSameCartItem(item, target));
    if (item && item.quantity > 1) {
      await updateCartItem(productId, item.quantity - 1, opts);
    }
  };

  const removeItem = async (productId, selectedOptions = {}) => {
    if (isSellerOrAdmin) return;

    const opts = getSelectedOptions(selectedOptions);

    if (isBuyer) {
      setCartLoading(true);
      setCartError(null);
      try {
        const payload = {
          productId,
          ...opts
        };
        const response = await cartAPI.remove(payload);
        const dbCart = response.data;
        const normalized = (dbCart.items || []).map(normalizeCartItem);
        setCart({ ...dbCart, items: normalized });
        setCartItems(normalized);
        setTotalItems(dbCart.totalItems !== undefined ? dbCart.totalItems : calculateCartTotals(normalized).totalItems);
        setTotalPrice(dbCart.totalPrice !== undefined ? dbCart.totalPrice : calculateCartTotals(normalized).totalPrice);
      } catch (err) {
        setCartError(err.response?.data?.message || "Failed to remove item");
      } finally {
        setCartLoading(false);
      }
    } else {
      const target = { productId, ...opts };
      const updatedItems = cartItems.filter(item => !isSameCartItem(item, target));

      localStorage.setItem("heritcraft_cart", JSON.stringify(updatedItems));
      const normalized = updatedItems.map(normalizeCartItem);
      setCart({ items: normalized });
      setCartItems(normalized);
      updateTotals(normalized);
    }
  };

  const clearCart = async () => {
    if (isSellerOrAdmin) return;

    if (isBuyer) {
      setCartLoading(true);
      setCartError(null);
      try {
        const response = await cartAPI.clear();
        const dbCart = response.data;
        const normalized = (dbCart.items || []).map(normalizeCartItem);
        setCart({ ...dbCart, items: normalized });
        setCartItems(normalized);
        setTotalItems(0);
        setTotalPrice(0);
      } catch (err) {
        setCartError(err.response?.data?.message || "Failed to clear cart");
      } finally {
        setCartLoading(false);
      }
    } else {
      localStorage.removeItem("heritcraft_cart");
      setCart({ items: [] });
      setCartItems([]);
      setTotalItems(0);
      setTotalPrice(0);
      setCartError(null);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems,
        cartLoading,
        cartError,
        totalItems,
        totalPrice,
        fetchCart,
        addToCart,
        updateCartItem,
        increaseQuantity,
        decreaseQuantity,
        removeItem,
        clearCart,
        mergeLocalCartToBackend,
        isSameCartItem
      }}
    >
      {children}
    </CartContext.Provider>
  );
};