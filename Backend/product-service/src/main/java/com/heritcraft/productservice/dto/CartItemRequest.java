package com.heritcraft.productservice.dto;

import lombok.Data;

@Data
public class CartItemRequest {
    private String productId;
    private Integer quantity;
    private String selectedSize;
    private String selectedWeight;
    private String selectedLength;
    private String selectedVolume;
    private String selectedQuantityOption;
}
