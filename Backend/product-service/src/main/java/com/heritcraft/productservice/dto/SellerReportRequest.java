package com.heritcraft.productservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SellerReportRequest {
    private Long sellerId;

    @NotBlank(message = "Report reason is required")
    private String reason;
}
