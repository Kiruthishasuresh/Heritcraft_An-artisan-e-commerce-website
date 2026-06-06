package com.heritcraft.productservice.service;

import com.heritcraft.productservice.dto.OrderRequest;
import com.heritcraft.productservice.entity.Order;
import com.heritcraft.productservice.entity.OrderItem;
import com.heritcraft.productservice.entity.Payment;
import com.heritcraft.productservice.entity.Product;
import com.heritcraft.productservice.repository.OrderRepository;
import com.heritcraft.productservice.repository.PaymentRepository;
import com.heritcraft.productservice.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;

    // Valid status transitions — order matters
    private static final List<String> STATUS_FLOW = List.of(
            "PLACED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"
    );

    public OrderService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            PaymentRepository paymentRepository
    ) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
    }

    public Order createOrder(OrderRequest request, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getId().equals(request.getUserId())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Cannot place order for another user.");
        }

        // Strict final stock validation before saving any modifications to prevent overselling
        for (OrderItem item : request.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));

            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int orderQty = item.getQuantity() == null ? 1 : item.getQuantity();

            if (currentStock < orderQty) {
                throw new RuntimeException("Insufficient stock for product: " + product.getName() + " (Requested: " + orderQty + ", Available: " + currentStock + ")");
            }
        }

        // Deduct stock after validation succeeds
        for (OrderItem item : request.getItems()) {
            Product product = productRepository.findById(item.getProductId()).get();
            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int currentSold = product.getSoldQuantity() == null ? 0 : product.getSoldQuantity();
            int orderQty = item.getQuantity() == null ? 1 : item.getQuantity();

            product.setStock(currentStock - orderQty);
            product.setSoldQuantity(currentSold + orderQty);
            productRepository.save(product);
        }

        Order order = new Order();

        order.setUserId(request.getUserId());
        order.setUserName(request.getUserName());
        order.setUserEmail(request.getUserEmail());

        order.setItems(request.getItems());

        order.setSubtotal(request.getSubtotal());
        order.setShipping(request.getShipping());
        order.setTax(request.getTax());
        order.setTotalAmount(request.getTotalAmount());

        order.setPaymentMethod(request.getPaymentMethod());

        if ("Cash on Delivery".equalsIgnoreCase(request.getPaymentMethod())) {
            order.setPaymentStatus("COD_PENDING");
        } else {
            order.setPaymentStatus("PAID");
        }

        order.setOrderStatus("PLACED");

        order.setFullName(request.getFullName());
        order.setPhone(request.getPhone());
        order.setZip(request.getZip());
        order.setAddress(request.getAddress());
        order.setCity(request.getCity());
        order.setState(request.getState());

        order.onCreate();

        Order savedOrder = orderRepository.save(order);

        Payment payment = new Payment();

        payment.setOrderId(savedOrder.getId());
        payment.setUserId(savedOrder.getUserId());
        payment.setUserEmail(savedOrder.getUserEmail());
        payment.setAmount(savedOrder.getTotalAmount());
        payment.setPaymentMethod(savedOrder.getPaymentMethod());
        payment.setPaymentStatus(savedOrder.getPaymentStatus());
        payment.setRefundStatus("NOT_REFUNDED");
        payment.setTransactionId("TXN-" + savedOrder.getId());
        payment.onCreate();

        paymentRepository.save(payment);

        return savedOrder;
    }

    public List<Order> getOrdersByUser(Long userId, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: You can only view your own orders.");
        }
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Order> getOrdersBySeller(Long sellerId, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getId().equals(sellerId)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: You can only view your own shop orders.");
        }
        return orderRepository.findByItemsSellerIdOrderByCreatedAtDesc(sellerId);
    }

    /**
     * Update order status with proper flow validation.
     * Status flow: PLACED → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
     * Cancellation only allowed at PLACED status.
     */
    public Order updateOrderStatus(String id, String status, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String oldStatus = order.getOrderStatus();
        String newStatus = status.toUpperCase().replace(" ", "_");

        if ("CANCELLED".equals(oldStatus)) {
            throw new RuntimeException("Cancelled order cannot be updated");
        }

        if ("DELIVERED".equals(oldStatus)) {
            throw new RuntimeException("Delivered order cannot be changed");
        }

        // Access Control
        if ("CANCELLED".equals(newStatus)) {
            // Buyer can cancel only their own orders. Admin can cancel any.
            if (!"admin".equalsIgnoreCase(user.getRole()) && !order.getUserId().equals(user.getId())) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: You can only cancel your own orders.");
            }

            // Cancellation only allowed at PLACED status
            if (!"PLACED".equals(oldStatus)) {
                throw new RuntimeException("Order can only be cancelled when status is PLACED");
            }

            restoreStockAndSoldQuantity(order);

            order.setPaymentStatus("REFUNDED");

            paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
                payment.setPaymentStatus("REFUNDED");
                payment.setRefundStatus("REFUNDED");
                payment.setRefundedAt(LocalDateTime.now());
                paymentRepository.save(payment);
            });
        } else {
            // Seller can update status only if the order contains their products. Admin can do all.
            if (!"admin".equalsIgnoreCase(user.getRole())) {
                if ("seller".equalsIgnoreCase(user.getRole())) {
                    boolean ownsItem = order.getItems().stream()
                            .anyMatch(item -> user.getId().equals(item.getSellerId()));
                    if (!ownsItem) {
                        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: You can only update orders containing your products.");
                    }
                } else {
                    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Only sellers or admins can update order tracking status.");
                }
            }

            // Validate forward-only status transitions
            int oldIndex = STATUS_FLOW.indexOf(oldStatus);
            int newIndex = STATUS_FLOW.indexOf(newStatus);

            if (oldIndex < 0 || newIndex < 0) {
                throw new RuntimeException("Invalid status: " + newStatus);
            }

            if (newIndex <= oldIndex) {
                throw new RuntimeException("Cannot move status backward. Current: " + oldStatus + ", Requested: " + newStatus);
            }
        }

        order.setOrderStatus(newStatus);
        
        if ("DELIVERED".equals(newStatus)) {
            order.setDeliveredAt(LocalDateTime.now());
        }

        return orderRepository.save(order);
    }

    /**
     * Get all orders — admin endpoint.
     */
    public List<Order> getAllOrders(String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Admin role required.");
        }

        return orderRepository.findAll()
                .stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .collect(Collectors.toList());
    }

    /**
     * Get seller dashboard stats.
     */
    public Map<String, Object> getSellerStats(Long sellerId, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getId().equals(sellerId)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Cannot fetch stats for another seller.");
        }

        List<Order> sellerOrders = orderRepository.findByItemsSellerIdOrderByCreatedAtDesc(sellerId);

        long totalOrders = sellerOrders.size();
        long pending = sellerOrders.stream().filter(o -> "PLACED".equals(o.getOrderStatus())).count();
        long packed = sellerOrders.stream().filter(o -> "PACKED".equals(o.getOrderStatus())).count();
        long shipped = sellerOrders.stream().filter(o -> "SHIPPED".equals(o.getOrderStatus())).count();
        long outForDelivery = sellerOrders.stream().filter(o -> "OUT_FOR_DELIVERY".equals(o.getOrderStatus())).count();
        long delivered = sellerOrders.stream().filter(o -> "DELIVERED".equals(o.getOrderStatus())).count();
        long cancelled = sellerOrders.stream().filter(o -> "CANCELLED".equals(o.getOrderStatus())).count();

        // Revenue = sum of delivered, non-cancelled orders
        double revenue = sellerOrders.stream()
                .filter(o -> "DELIVERED".equals(o.getOrderStatus()))
                .mapToDouble(o -> {
                    // Only count items belonging to this seller
                    return o.getItems().stream()
                            .filter(item -> sellerId.equals(item.getSellerId()))
                            .mapToDouble(item -> (item.getPrice() != null ? item.getPrice() : 0)
                                    * (item.getQuantity() != null ? item.getQuantity() : 1))
                            .sum();
                })
                .sum();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalOrders", totalOrders);
        stats.put("pending", pending);
        stats.put("packed", packed);
        stats.put("shipped", shipped);
        stats.put("outForDelivery", outForDelivery);
        stats.put("delivered", delivered);
        stats.put("cancelled", cancelled);
        stats.put("revenue", revenue);
        
        long pendingRefunds = sellerOrders.stream().filter(o -> o.isRefundRequested() && "REQUESTED".equals(o.getRefundStatus())).count();
        stats.put("pendingRefunds", pendingRefunds);

        return stats;
    }

    /**
     * Get admin platform stats.
     */
    public Map<String, Object> getAdminStats(String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Admin role required.");
        }

        List<Order> allOrders = orderRepository.findAll();

        long totalOrders = allOrders.size();
        long delivered = allOrders.stream().filter(o -> "DELIVERED".equals(o.getOrderStatus())).count();
        long cancelled = allOrders.stream().filter(o -> "CANCELLED".equals(o.getOrderStatus())).count();
        long active = totalOrders - cancelled;

        double totalRevenue = allOrders.stream()
                .filter(o -> !"CANCELLED".equals(o.getOrderStatus()))
                .mapToDouble(o -> o.getTotalAmount() != null ? o.getTotalAmount() : 0)
                .sum();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalOrders", totalOrders);
        stats.put("activeOrders", active);
        stats.put("delivered", delivered);
        stats.put("cancelled", cancelled);
        stats.put("totalRevenue", totalRevenue);
        
        long pendingRefunds = allOrders.stream().filter(o -> o.isRefundRequested() && "REQUESTED".equals(o.getRefundStatus())).count();
        stats.put("pendingRefunds", pendingRefunds);

        return stats;
    }

    private void restoreStockAndSoldQuantity(Order order) {

        for (OrderItem item : order.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElse(null);

            if (product != null) {
                int currentStock = product.getStock() == null ? 0 : product.getStock();
                int currentSold = product.getSoldQuantity() == null ? 0 : product.getSoldQuantity();
                int qty = item.getQuantity() == null ? 1 : item.getQuantity();

                product.setStock(currentStock + qty);
                product.setSoldQuantity(Math.max(0, currentSold - qty));

                productRepository.save(product);
            }
        }
    }

    public Order requestReturn(String id, String productId, String reason, String customReason, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!"admin".equalsIgnoreCase(user.getRole()) && !order.getUserId().equals(user.getId())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: You can only return your own items.");
        }

        if (!"DELIVERED".equals(order.getOrderStatus())) {
            throw new RuntimeException("Returns can only be requested for delivered orders.");
        }
        
        if (order.getDeliveredAt() != null && java.time.temporal.ChronoUnit.DAYS.between(order.getDeliveredAt(), LocalDateTime.now()) > 7) {
            throw new RuntimeException("Return window has closed. Returns are only allowed within 7 days of delivery.");
        }

        boolean found = false;
        for (OrderItem item : order.getItems()) {
            if (item.getProductId().equals(productId)) {
                if (item.getReturnStatus() != null && !"RETURN_REJECTED".equals(item.getReturnStatus())) {
                    throw new RuntimeException("Return already requested for this item.");
                }
                item.setReturnStatus("RETURN_REQUESTED");
                item.setReturnReason(reason);
                item.setReturnCustomReason(customReason);
                found = true;
                break;
            }
        }

        if (!found) {
            throw new RuntimeException("Item not found in order.");
        }

        return orderRepository.save(order);
    }

    public Order updateReturnStatus(String id, String productId, String status, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        boolean found = false;
        for (OrderItem item : order.getItems()) {
            if (item.getProductId().equals(productId)) {
                if (!"admin".equalsIgnoreCase(user.getRole())) {
                    if ("seller".equalsIgnoreCase(user.getRole())) {
                        if (!user.getId().equals(item.getSellerId())) {
                            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: You can only approve returns for your own products.");
                        }
                    } else {
                        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Only sellers or admins can update return status.");
                    }
                }

                if (!"RETURN_REQUESTED".equals(item.getReturnStatus())) {
                    throw new RuntimeException("No active return request for this item.");
                }
                
                String newStatus = status.toUpperCase().replace(" ", "_");
                if (!"RETURN_APPROVED".equals(newStatus) && !"RETURN_REJECTED".equals(newStatus)) {
                    throw new RuntimeException("Invalid return status.");
                }
                
                item.setReturnStatus(newStatus);
                
                // Partial Refund Logic
                if ("RETURN_APPROVED".equals(newStatus)) {
                    Double itemRefund = (item.getPrice() != null ? item.getPrice() : 0.0) * (item.getQuantity() != null ? item.getQuantity() : 1);
                    order.setRefundedAmount((order.getRefundedAmount() == null ? 0.0 : order.getRefundedAmount()) + itemRefund);
                    
                    paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
                        double currentRefund = payment.getRefundedAmount() == null ? 0.0 : payment.getRefundedAmount();
                        payment.setRefundedAmount(currentRefund + itemRefund);
                        
                        // Check if fully refunded
                        if (payment.getRefundedAmount() >= (payment.getAmount() != null ? payment.getAmount() : 0.0)) {
                            payment.setRefundStatus("REFUNDED");
                            payment.setPaymentStatus("REFUNDED");
                            payment.setRefundedAt(LocalDateTime.now());
                        } else {
                            payment.setRefundStatus("PARTIALLY_REFUNDED");
                        }
                        paymentRepository.save(payment);
                    });
                }
                
                found = true;
                break;
            }
        }

        if (!found) {
            throw new RuntimeException("Item not found in order.");
        }

        return orderRepository.save(order);
    }

    public Order requestRefund(String orderId, String reason, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!"admin".equalsIgnoreCase(user.getRole()) && !order.getUserId().equals(user.getId())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: You can only request refund for your own orders.");
        }

        if ("CANCELLED".equals(order.getOrderStatus())) {
            throw new RuntimeException("Refund can only be requested for active orders.");
        }

        if (order.isRefundRequested() || !"NONE".equals(order.getRefundStatus())) {
            throw new RuntimeException("Refund has already been requested for this order.");
        }

        order.setRefundRequested(true);
        order.setRefundStatus("REQUESTED");
        order.setRefundReason(reason);
        order.setRefundRequestedAt(LocalDateTime.now());

        return orderRepository.save(order);
    }

    public List<Order> getSellerRefundRequests(Long sellerId, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole()) && !"seller".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Only sellers or admins can view refund requests.");
        }

        if ("seller".equalsIgnoreCase(user.getRole()) && !user.getId().equals(sellerId)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Cannot view refund requests for another seller.");
        }

        List<Order> allRefundOrders = orderRepository.findAll().stream()
                .filter(Order::isRefundRequested)
                .collect(Collectors.toList());

        return allRefundOrders.stream()
                .filter(o -> o.getItems().stream().anyMatch(item -> sellerId.equals(item.getSellerId())))
                .collect(Collectors.toList());
    }

    public List<Order> getAdminRefundRequests(String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Admin role required.");
        }

        return orderRepository.findAll().stream()
                .filter(Order::isRefundRequested)
                .collect(Collectors.toList());
    }

    public Order approveRefund(String orderId, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!"admin".equalsIgnoreCase(user.getRole())) {
            if ("seller".equalsIgnoreCase(user.getRole())) {
                boolean ownsItem = order.getItems().stream().anyMatch(item -> user.getId().equals(item.getSellerId()));
                if (!ownsItem) {
                    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: You can only approve refunds for your own sold products.");
                }
            } else {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Only sellers or admins can approve refunds.");
            }
        }

        order.setRefundStatus("APPROVED");
        order.setRefundApprovedAt(LocalDateTime.now());

        return orderRepository.save(order);
    }

    public Order rejectRefund(String orderId, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!"admin".equalsIgnoreCase(user.getRole())) {
            if ("seller".equalsIgnoreCase(user.getRole())) {
                boolean ownsItem = order.getItems().stream().anyMatch(item -> user.getId().equals(item.getSellerId()));
                if (!ownsItem) {
                    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: You can only reject refunds for your own sold products.");
                }
            } else {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Only sellers or admins can reject refunds.");
            }
        }

        order.setRefundStatus("REJECTED");
        order.setRefundRejectedAt(LocalDateTime.now());

        return orderRepository.save(order);
    }

    public void deleteOrder(String id, String authHeader) {
        com.heritcraft.productservice.dto.AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Admin role required.");
        }
        throw new RuntimeException("Orders should not be deleted. Cancel the order instead.");
    }

    private final org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
    private static final String USER_SERVICE_ME_URL = "http://127.0.0.1:8081/api/auth/me";

    private com.heritcraft.productservice.dto.AuthUserResponse getLoggedInUser(String authHeader) {
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", authHeader);
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.http.ResponseEntity<com.heritcraft.productservice.dto.AuthUserResponse> response =
                    restTemplate.exchange(
                            USER_SERVICE_ME_URL,
                            org.springframework.http.HttpMethod.GET,
                            entity,
                            com.heritcraft.productservice.dto.AuthUserResponse.class
                    );
            com.heritcraft.productservice.dto.AuthUserResponse user = response.getBody();
            if (user == null) {
                throw new RuntimeException("Invalid user");
            }
            return user;
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Unauthorized. Please login again.");
        }
    }
}