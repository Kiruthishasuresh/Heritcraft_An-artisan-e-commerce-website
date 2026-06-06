package com.heritcraft.productservice.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    private String id;

    private Long userId;
    private String userName;
    private String userEmail;

    private List<OrderItem> items = new ArrayList<>();

    private Double subtotal;
    private Double shipping;
    private Double tax;
    private Double totalAmount;

    private String paymentMethod;
    private String paymentStatus = "PENDING";
    private String orderStatus = "PLACED";

    private String fullName;
    private String phone;
    private String zip;
    private String address;
    private String city;
    private String state;

    private LocalDateTime createdAt;
    private LocalDateTime deliveredAt;
    
    private Double refundedAmount = 0.0;
    
    // Razorpay and transaction tracking fields
    private String paymentProvider;
    private String transactionId;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private LocalDateTime paidAt;
    private String paymentFailureReason;

    // Refund fields
    private boolean refundRequested = false;
    private String refundStatus = "NONE";
    private String refundReason;
    private LocalDateTime refundRequestedAt;
    private LocalDateTime refundApprovedAt;
    private LocalDateTime refundRejectedAt;
    private LocalDateTime refundProcessedAt;

    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}