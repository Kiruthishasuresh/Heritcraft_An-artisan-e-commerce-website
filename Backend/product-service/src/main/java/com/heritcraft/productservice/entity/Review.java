package com.heritcraft.productservice.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Review {

    @Id
    private String id;

    private String productId;
    private String productName;
    private String productImage;
    private Long sellerId;
    private String sellerName;
    private String sellerShopName;
    private Long userId; // acts as buyerId
    private String userName; // acts as buyerName
    private String buyerEmail;
    private String orderId;

    private Integer rating; // 1-5
    private String comment;
    private List<String> images = new ArrayList<>();

    private String status = "VISIBLE"; // VISIBLE, HIDDEN, DELETED, REPORTED, PENDING, APPROVED, REJECTED
    private String adminNote;
    private String sellerReply;
    private LocalDateTime sellerReplyAt;
    private String reportedReason;
    private LocalDateTime reportedAt;
    private LocalDateTime hiddenAt;
    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "VISIBLE";
        }
    }

    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
