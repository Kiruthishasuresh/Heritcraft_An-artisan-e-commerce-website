package com.heritcraft.productservice.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    private String id;

    private String orderId;

    private Long userId;
    private String userEmail;

    private Double amount;

    private String paymentMethod;
    private String paymentStatus;

    private String refundStatus;
    private Double refundedAmount = 0.0;

    private String transactionId;

    private LocalDateTime createdAt;
    private LocalDateTime refundedAt;

    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}