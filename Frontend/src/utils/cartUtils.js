export const getProductId = (item) => {
  if (!item) return "";
  if (item.productId) return item.productId;
  if (item.product) {
    return item.product._id || item.product.id || "";
  }
  return "";
};

export const getSelectedOptions = (item) => {
  if (!item) return {};
  return {
    selectedSize: item.selectedSize || null,
    selectedWeight: item.selectedWeight || null,
    selectedLength: item.selectedLength || null,
    selectedVolume: item.selectedVolume || null,
    selectedQuantityOption: item.selectedQuantityOption || null,
  };
};

export const getCartItemKey = (item) => {
  const pId = getProductId(item);
  const opts = getSelectedOptions(item);
  return `${pId}-${opts.selectedSize || ""}-${opts.selectedWeight || ""}-${opts.selectedLength || ""}-${opts.selectedVolume || ""}-${opts.selectedQuantityOption || ""}`;
};

export const isSameCartItem = (item1, item2) => {
  if (!item1 || !item2) return false;
  const id1 = getProductId(item1);
  const id2 = getProductId(item2);
  if (id1 !== id2) return false;

  const opts1 = getSelectedOptions(item1);
  const opts2 = getSelectedOptions(item2);

  const normalize = (val) => (val === null || val === undefined ? "" : String(val).trim().toLowerCase());

  return (
    normalize(opts1.selectedSize) === normalize(opts2.selectedSize) &&
    normalize(opts1.selectedWeight) === normalize(opts2.selectedWeight) &&
    normalize(opts1.selectedLength) === normalize(opts2.selectedLength) &&
    normalize(opts1.selectedVolume) === normalize(opts2.selectedVolume) &&
    normalize(opts1.selectedQuantityOption) === normalize(opts2.selectedQuantityOption)
  );
};

export const calculateCartTotals = (items) => {
  if (!Array.isArray(items)) return { totalItems: 0, totalPrice: 0 };
  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => {
    const price = Number(item.product?.price || item.price || 0);
    return sum + price * Number(item.quantity || 0);
  }, 0);
  return { totalItems, totalPrice };
};

export const normalizeCartItem = (item) => {
  if (!item) return null;
  const productId = getProductId(item);
  const opts = getSelectedOptions(item);
  return {
    productId,
    product: item.product || {
      _id: productId,
      id: productId,
      name: item.productName || "",
      price: item.price || 0,
      images: item.image ? [item.image] : [],
      stock: item.stock || 0,
    },
    quantity: Number(item.quantity || 0),
    ...opts
  };
};

export const hasSelectedOptions = (item) => {
  const opts = getSelectedOptions(item);
  return !!(opts.selectedSize || opts.selectedWeight || opts.selectedLength || opts.selectedVolume || opts.selectedQuantityOption);
};

export const validateCartQuantity = (quantity, stock) => {
  let qty = Number(quantity);
  if (isNaN(qty) || qty < 1) qty = 1;
  if (stock !== undefined && stock !== null && qty > stock) {
    qty = stock;
  }
  return qty;
};
