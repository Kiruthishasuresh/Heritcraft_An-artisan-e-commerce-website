package com.heritcraft.productservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotBlank(message = "Product name is required")
    private String name;

    @NotBlank(message = "Category is required")
    private String category;

    private String productType;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be positive")
    private Double price;

    private Double oldPrice;

    @NotNull(message = "Stock is required")
    @Min(value = 0, message = "Stock must be >= 0")
    private Integer stock;

    private String description;
    private String handmadeStory;
    private String material;
    private String deliveryTime;
    private boolean featured = false;
    private boolean approved;

    private Long sellerId;
    private String sellerName;
    private String sellerShopName;
    private String sellerProfileImage;

    private List<String> sizes = new ArrayList<>();
    private List<String> weights = new ArrayList<>();
    private List<String> lengths = new ArrayList<>();
    private List<String> volumes = new ArrayList<>();
    private List<String> quantities = new ArrayList<>();

    private String makingVideoUrl;
    private String makingVideoTitle;

    private List<MediaItemDto> media = new ArrayList<>();
}
