package com.heritcraft.productservice.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {
    private String productId;
    private String productName;
    private String image;
    private Integer quantity;
    private Double price;
    private String selectedSize;
    private String selectedWeight;
    private String selectedLength;
    private String selectedVolume;
    private String selectedQuantityOption;
    private Long sellerId;
    private String sellerName;
    private String sellerShopName;

    // Return fields
    private String returnStatus; // e.g., RETURN_REQUESTED, RETURN_APPROVED, RETURN_REJECTED
    private String returnReason; // default reason
    private String returnCustomReason; // customised reason
}