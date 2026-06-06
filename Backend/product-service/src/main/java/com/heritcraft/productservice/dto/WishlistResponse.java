package com.heritcraft.productservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WishlistResponse {
    private String id;
    private Long buyerId;
    private List<WishlistItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
