package com.heritcraft.productservice.controller;

import com.heritcraft.productservice.dto.CartItemRequest;
import com.heritcraft.productservice.dto.CartResponse;
import com.heritcraft.productservice.service.CartService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public ResponseEntity<CartResponse> getCart(@RequestHeader("Authorization") String authHeader) {
        return ResponseEntity.ok(cartService.getCart(authHeader));
    }

    @PostMapping("/add")
    public ResponseEntity<CartResponse> addToCart(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CartItemRequest request
    ) {
        return ResponseEntity.ok(cartService.addToCart(request, authHeader));
    }

    @PutMapping("/update")
    public ResponseEntity<CartResponse> updateCartItem(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CartItemRequest request
    ) {
        return ResponseEntity.ok(cartService.updateCartItem(request, authHeader));
    }

    @PostMapping("/remove")
    public ResponseEntity<CartResponse> removeCartItem(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CartItemRequest request
    ) {
        return ResponseEntity.ok(cartService.removeCartItem(request, authHeader));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<CartResponse> clearCart(@RequestHeader("Authorization") String authHeader) {
        return ResponseEntity.ok(cartService.clearCart(authHeader));
    }

    @PostMapping("/merge")
    public ResponseEntity<CartResponse> mergeCart(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody java.util.List<CartItemRequest> requests
    ) {
        return ResponseEntity.ok(cartService.mergeCart(requests, authHeader));
    }
}
