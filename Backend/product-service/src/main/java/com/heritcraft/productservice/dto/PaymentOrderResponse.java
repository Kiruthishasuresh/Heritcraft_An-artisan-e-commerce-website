package com.heritcraft.productservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderResponse {
    private String keyId;
    private String razorpayOrderId;
    private Integer amount; // paise
    private String currency;
}
