package com.heritcraft.productservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SellerReplyRequest {
    private Long sellerId;

    @NotBlank(message = "Reply text is required")
    private String reply;
}
