package com.heritcraft.productservice.dto;

import lombok.Data;

@Data
public class PaymentOrderRequest {
    private Double amount;
    private String currency = "INR";
    private String receipt;
    private OrderRequest orderRequest;
}
