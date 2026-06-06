package com.heritcraft.productservice.controller;

import com.heritcraft.productservice.dto.OrderRequest;
import com.heritcraft.productservice.entity.Order;
import com.heritcraft.productservice.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<Order> createOrder(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody OrderRequest request
    ) {
        return new ResponseEntity<>(orderService.createOrder(request, authHeader), HttpStatus.CREATED);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Order>> getOrdersByUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(orderService.getOrdersByUser(userId, authHeader));
    }

    @GetMapping("/seller/{sellerId}")
    public ResponseEntity<List<Order>> getOrdersBySeller(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId
    ) {
        return ResponseEntity.ok(orderService.getOrdersBySeller(sellerId, authHeader));
    }

    /**
     * GET /api/orders/admin/all — Get all platform orders (admin)
     */
    @GetMapping("/admin/all")
    public ResponseEntity<List<Order>> getAllOrders(@RequestHeader("Authorization") String authHeader) {
        return ResponseEntity.ok(orderService.getAllOrders(authHeader));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, body.get("status"), authHeader));
    }

    /**
     * PUT /api/orders/{id}/cancel — Buyer cancel order (only at PLACED status)
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Order> cancelOrder(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, "CANCELLED", authHeader));
    }

    /**
     * GET /api/orders/seller/{sellerId}/stats — Seller dashboard stats
     */
    @GetMapping("/seller/{sellerId}/stats")
    public ResponseEntity<Map<String, Object>> getSellerStats(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId
    ) {
        return ResponseEntity.ok(orderService.getSellerStats(sellerId, authHeader));
    }

    /**
     * GET /api/orders/admin/stats — Admin platform stats
     */
    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats(@RequestHeader("Authorization") String authHeader) {
        return ResponseEntity.ok(orderService.getAdminStats(authHeader));
    }

    /**
     * PUT /api/orders/{id}/items/{productId}/return — Buyer request return
     */
    @PutMapping("/{id}/items/{productId}/return")
    public ResponseEntity<Order> requestReturn(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id,
            @PathVariable String productId,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(orderService.requestReturn(id, productId, body.get("reason"), body.get("customReason"), authHeader));
    }

    /**
     * PUT /api/orders/{id}/items/{productId}/return-status — Seller approve/reject return
     */
    @PutMapping("/{id}/items/{productId}/return-status")
    public ResponseEntity<Order> updateReturnStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id,
            @PathVariable String productId,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(orderService.updateReturnStatus(id, productId, body.get("status"), authHeader));
    }

    @PutMapping("/{id}/refund-request")
    public ResponseEntity<Order> requestRefund(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(orderService.requestRefund(id, body.get("reason"), authHeader));
    }

    @GetMapping("/seller/{sellerId}/refund-requests")
    public ResponseEntity<List<Order>> getSellerRefundRequests(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId
    ) {
        return ResponseEntity.ok(orderService.getSellerRefundRequests(sellerId, authHeader));
    }

    @GetMapping("/admin/refund-requests")
    public ResponseEntity<List<Order>> getAdminRefundRequests(
            @RequestHeader("Authorization") String authHeader
    ) {
        return ResponseEntity.ok(orderService.getAdminRefundRequests(authHeader));
    }

    @PutMapping("/{id}/refund/approve")
    public ResponseEntity<Order> approveRefund(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id
    ) {
        return ResponseEntity.ok(orderService.approveRefund(id, authHeader));
    }

    @PutMapping("/{id}/refund/reject")
    public ResponseEntity<Order> rejectRefund(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id
    ) {
        return ResponseEntity.ok(orderService.rejectRefund(id, authHeader));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id
    ) {
        orderService.deleteOrder(id, authHeader);
        return ResponseEntity.noContent().build();
    }
}