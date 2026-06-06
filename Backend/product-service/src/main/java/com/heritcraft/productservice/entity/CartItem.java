package com.heritcraft.productservice.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartItem {
    private String productId;
    private Integer quantity;
    private String selectedSize;
    private String selectedWeight;
    private String selectedLength;
    private String selectedVolume;
    private String selectedQuantityOption;
}
