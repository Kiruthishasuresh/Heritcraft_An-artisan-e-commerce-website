package com.heritcraft.productservice.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    private String id;

    private String name;
    private String category;
    private String productType;
    private Double price;
    private Double oldPrice;
    private Integer stock;
    private Integer soldQuantity = 0;
    private String description;
    private String handmadeStory;
    private String material;
    private String deliveryTime;
    private boolean featured = false;

    private Long sellerId;
    private String sellerName;
    private String sellerShopName;
    private boolean sellerApproved = false;
    private boolean approved = false;
    private String sellerProfileImage;

    private Double averageRating = 0.0;
    private Integer numReviews = 0;
    private Integer offer = 0;

    private LocalDateTime createdAt;

    private List<ProductMedia> media = new ArrayList<>();
    private List<String> sizes = new ArrayList<>();
    private List<String> weights = new ArrayList<>();
    private List<String> lengths = new ArrayList<>();
    private List<String> volumes = new ArrayList<>();
    private List<String> quantities = new ArrayList<>();

    private String makingVideoUrl;
    private String makingVideoTitle;
    

    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        calculateOffer();
    }

    public void calculateOffer() {
        if (oldPrice != null && oldPrice > price && oldPrice > 0) {
            this.offer = (int) Math.round(((oldPrice - price) / oldPrice) * 100);
        } else {
            this.offer = 0;
        }
    }
}