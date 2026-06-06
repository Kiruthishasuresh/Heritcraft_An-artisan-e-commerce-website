package com.heritcraft.productservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WishlistItemResponse {
    private String productId;
    private String productName;
    private String image;
    private Double price;
    private Long sellerId;
    private String sellerName;
    private String sellerShopName;
    private Integer stock;
    private LocalDateTime addedAt;
}
