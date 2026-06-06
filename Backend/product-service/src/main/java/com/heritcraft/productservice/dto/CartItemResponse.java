package com.heritcraft.productservice.dto;

import lombok.Data;

@Data
public class CartItemResponse {
    private ProductResponse product;
    private Integer quantity;
    private String selectedSize;
    private String selectedWeight;
    private String selectedLength;
    private String selectedVolume;
    private String selectedQuantityOption;
    private Double subtotal;
}
