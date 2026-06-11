import axios from "axios";

const API = axios.create({
  baseURL: "/api",
});

/**
 * Request interceptor — attach JWT Bearer token from sessionStorage.
 */
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("heritcraft_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Response interceptor — auto-logout on 401.
 */
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = error.config?.url || "";

      // Don't clear on login/register failures
      if (!path.includes("/auth/login") && !path.includes("/auth/register")) {
        sessionStorage.removeItem("heritcraft_token");
        sessionStorage.removeItem("heritcraft_user");

        // Clear old persistent auth data if present
        localStorage.removeItem("heritcraft_token");
        localStorage.removeItem("heritcraft_user");

        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  getPublicKey: () => API.get("/auth/public-key"),
  login: (data) => API.post("/auth/login", data),
  register: (data) => API.post("/auth/register", data),
  getMe: () => API.get("/auth/me"),
  forgotPassword: (email) => API.post("/auth/forgot-password", { email }),
  verifyOtp: (email, otp) => API.post("/auth/verify-otp", { email, otp }),
  resetPassword: (email, otp, newPassword) =>
    API.post("/auth/reset-password", { email, otp, newPassword }),
  verifyPhoneOtp: (phone, otp) =>
    API.post("/auth/phone-otp/verify", { phone, otp }),
  sendPhoneOtp: (phone) =>
    API.post("/auth/phone-otp/send", { phone }),
  sendSignupMobileOtp: (data) =>
    API.post("/auth/phone-otp/send", data),
  verifySignupMobileOtp: (data) =>
    API.post("/auth/phone-otp/verify", data),
  resendSignupMobileOtp: (data) =>
    API.post("/auth/phone-otp/send", data),
  sendEmailOtp: (email) =>
    API.post("/auth/email-otp/send", { email }),
  verifyEmailOtp: (email, otp) =>
    API.post("/auth/email-otp/verify", { email, otp }),
};

export const userAPI = {
  getAll: () => API.get("/users"),
  getById: (id) => API.get(`/users/${id}`),
  getSellers: () => API.get("/users/sellers"),
  getPendingSellers: () => API.get("/users/sellers/pending"),
  approveSeller: (id) => API.put(`/users/${id}/approve`),
  rejectSeller: (id) => API.put(`/users/${id}/reject`),
  disableUser: (id) => API.put(`/users/${id}/disable`),
  enableUser: (id) => API.put(`/users/${id}/enable`),
  updateProfile: (id, data) => API.put(`/users/${id}/profile`, data),
  changePassword: (id, data) => API.put(`/users/${id}/change-password`, data),
  deleteUser: (id) => API.delete(`/users/${id}`),
};

export const productAPI = {
  getAll: () => API.get("/products"),
  getAllAdmin: () => API.get("/products/admin/all"),
  getOne: (id) => API.get(`/products/${id}`),
  getBySeller: (sellerId) => API.get(`/products/seller/${sellerId}`),
  getFeatured: () => API.get("/products/featured"),
  search: (query) =>
    API.get(`/products/search?q=${encodeURIComponent(query || "")}`),
  getCategories: () => API.get("/products/categories"),
  create: (data) => API.post("/products", data),
  update: (id, data) => API.put(`/products/${id}`, data),
  delete: (id) => API.delete(`/products/${id}`),
  updateSellerApproval: (sellerId, approved) =>
    API.put(`/products/seller/${sellerId}/approval?approved=${approved}`),
  syncSellerProfile: (sellerId, data) =>
    API.put(`/products/seller/${sellerId}/sync-profile`, data),
  approveProduct: (id) => API.put(`/products/${id}/approve`),
  rejectProduct: (id) => API.put(`/products/${id}/reject`),
};

export const orderAPI = {
  create: (data) => API.post("/orders", data),
  getByUser: (userId) => API.get(`/orders/user/${userId}`),
  getBySeller: (sellerId) => API.get(`/orders/seller/${sellerId}`),
  getAllAdmin: () => API.get("/orders/admin/all"),
  updateStatus: (id, status) => API.put(`/orders/${id}/status`, { status }),
  cancelOrder: (id) => API.put(`/orders/${id}/cancel`),
  getSellerStats: (sellerId) => API.get(`/orders/seller/${sellerId}/stats`),
  getAdminStats: () => API.get("/orders/admin/stats"),
  delete: (id) => API.delete(`/orders/${id}`),

  requestReturn: (id, productId, data) =>
    API.put(`/orders/${id}/items/${productId}/return`, data),
  updateReturnStatus: (id, productId, status) =>
    API.put(`/orders/${id}/items/${productId}/return-status`, { status }),

  requestRefund: (orderId, data) =>
    API.put(`/orders/${orderId}/refund-request`, data),
  getSellerRefundRequests: (sellerId) =>
    API.get(`/orders/seller/${sellerId}/refund-requests`),
  getAdminRefundRequests: () => API.get("/orders/admin/refund-requests"),
  approveRefund: (orderId) => API.put(`/orders/${orderId}/refund/approve`),
  rejectRefund: (orderId) => API.put(`/orders/${orderId}/refund/reject`),
};

export const reviewAPI = {
  create: (data) => API.post("/reviews", data),
  getByProduct: (productId) => API.get(`/reviews/product/${productId}`),
  getByBuyer: (buyerId) => API.get(`/reviews/buyer/${buyerId}`),
  getBySeller: (sellerId) => API.get(`/reviews/seller/${sellerId}`),
  getSellerStats: (sellerId) => API.get(`/reviews/seller/${sellerId}/stats`),
  replyAsSeller: (reviewId, data) =>
    API.post(`/reviews/${reviewId}/seller-reply`, data),
  reportReview: (reviewId, data) =>
    API.post(`/reviews/${reviewId}/report`, data),
  getAllForAdmin: () => API.get("/reviews/admin/all"),
  getAdminStats: () => API.get("/reviews/admin/stats"),
  updateReviewStatus: (reviewId, data) =>
    API.put(`/reviews/admin/${reviewId}/status`, data),
  deleteReview: (reviewId) => API.delete(`/reviews/admin/${reviewId}`),
  restoreReview: (reviewId) => API.put(`/reviews/admin/${reviewId}/restore`),
};

export const cartAPI = {
  get: () => API.get("/cart"),
  add: (data) => API.post("/cart/add", data),
  update: (data) => API.put("/cart/update", data),
  remove: (data) => API.post("/cart/remove", data),
  clear: () => API.delete("/cart/clear"),
  merge: (items) => API.post("/cart/merge", items),
};

export const wishlistAPI = {
  get: () => API.get("/wishlist"),
  add: (productId) => API.post("/wishlist/add", { productId }),
  remove: (productId) => API.post("/wishlist/remove", { productId }),
  clear: () => API.delete("/wishlist/clear"),
  merge: (productIds) => API.post("/wishlist/merge", productIds),
};

export const reportAPI = {
  getSellerSummary: (sellerId, range, startDate, endDate) => {
    let url = `/reports/seller/${sellerId}/summary?range=${range || "daily"}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return API.get(url);
  },

  getSellerSalesTrend: (sellerId, range, startDate, endDate) => {
    let url = `/reports/seller/${sellerId}/sales-trend?range=${
      range || "daily"
    }`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return API.get(url);
  },

  downloadSellerReport: (sellerId, format, range, startDate, endDate) => {
    let url = `/reports/seller/${sellerId}/export?format=${format}&range=${
      range || "daily"
    }`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return API.get(url, { responseType: "blob" });
  },

  getAdminSummary: (range, startDate, endDate) => {
    let url = `/reports/admin/summary?range=${range || "daily"}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return API.get(url);
  },

  getAdminSalesTrend: (range, startDate, endDate) => {
    let url = `/reports/admin/sales-trend?range=${range || "daily"}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return API.get(url);
  },

  downloadAdminReport: (format, range, startDate, endDate) => {
    let url = `/reports/admin/export?format=${format}&range=${
      range || "daily"
    }`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return API.get(url, { responseType: "blob" });
  },
};

export const paymentAPI = {
  createOrder: (data) => API.post("/payments/create-order", data),
  verifyPayment: (data) => API.post("/payments/verify", data),
};

export const adminAPI = {};

export default API;