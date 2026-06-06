package com.heritcraft.productservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private String id;
    private String _id; // Same as id string for frontend compatibility
    private String name;
    private String category;
    private String productType;
    private Double price;
    private Double oldPrice;
    private Integer stock;
    private Integer soldQuantity;
    private String description;
    private String handmadeStory;
    private String material;
    private String deliveryTime;
    private boolean featured;
    private Long sellerId;
    private String sellerName;
    private String sellerShopName;
    private boolean sellerApproved;
    private boolean approved;
    private String sellerProfileImage;
    private Double averageRating;
    private Integer numReviews;
    private Integer offer;
    private LocalDateTime createdAt;

    private SellerInfo seller;

    private List<String> images = new ArrayList<>();
    private List<String> videos = new ArrayList<>();
    private List<String> sizes = new ArrayList<>();
    private List<String> weights = new ArrayList<>();
    private List<String> lengths = new ArrayList<>();
    private List<String> volumes = new ArrayList<>();
    private List<String> quantities = new ArrayList<>();

    private String makingVideoUrl;
    private String makingVideoTitle;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SellerInfo {
        private Long sellerId;
        private String name;
        private String shopName;
        private boolean approved;
        private String profileImage;
    }
}
