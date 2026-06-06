package com.heritcraft.productservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SellerProfileSyncRequest {
    private String sellerName;
    private String sellerShopName;
    private String sellerProfileImage;
}
