package com.heritcraft.productservice.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CartResponse {
    private String id;
    private Long userId;
    private List<CartItemResponse> items = new ArrayList<>();
    private Integer totalItems;
    private Double totalPrice;
}
