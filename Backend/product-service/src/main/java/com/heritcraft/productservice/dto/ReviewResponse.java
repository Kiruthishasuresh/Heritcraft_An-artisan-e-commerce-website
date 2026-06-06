package com.heritcraft.productservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private String id;
    private String productId;
    private String productName;
    private String productImage;
    private Long sellerId;
    private String sellerName;
    private String sellerShopName;
    private Long userId; // buyerId
    private String userName; // buyerName
    private String buyerEmail;
    private String orderId;

    private Integer rating;
    private String comment;
    private List<String> images;

    private String status;
    private String adminNote;
    private String sellerReply;
    private LocalDateTime sellerReplyAt;
    private String reportedReason;
    private LocalDateTime reportedAt;
    private LocalDateTime hiddenAt;
    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
