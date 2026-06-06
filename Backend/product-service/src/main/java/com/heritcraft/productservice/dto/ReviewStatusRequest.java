package com.heritcraft.productservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewStatusRequest {
    @NotBlank(message = "Status is required")
    private String status;

    private String adminNote;
}
