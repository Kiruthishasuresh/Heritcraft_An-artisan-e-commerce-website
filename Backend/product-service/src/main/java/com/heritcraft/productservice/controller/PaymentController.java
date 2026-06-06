package com.heritcraft.productservice.controller;

import com.heritcraft.productservice.dto.*;
import com.heritcraft.productservice.entity.Order;
import com.heritcraft.productservice.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create-order")
    public ResponseEntity<PaymentOrderResponse> createOrder(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody PaymentOrderRequest request
    ) {
        return ResponseEntity.ok(paymentService.createRazorpayOrder(request, authHeader));
    }

    @PostMapping("/verify")
    public ResponseEntity<Order> verifyPayment(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody PaymentVerifyRequest request
    ) {
        return ResponseEntity.ok(paymentService.verifyPaymentAndCreateOrder(request, authHeader));
    }
}
