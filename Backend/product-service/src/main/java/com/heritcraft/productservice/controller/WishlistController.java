package com.heritcraft.productservice.controller;

import com.heritcraft.productservice.dto.WishlistItemRequest;
import com.heritcraft.productservice.dto.WishlistResponse;
import com.heritcraft.productservice.service.WishlistService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    public ResponseEntity<WishlistResponse> getWishlist(
            @RequestHeader("Authorization") String authHeader
    ) {
        return ResponseEntity.ok(wishlistService.getWishlist(authHeader));
    }

    @PostMapping("/add")
    public ResponseEntity<WishlistResponse> addToWishlist(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody WishlistItemRequest request
    ) {
        return ResponseEntity.ok(wishlistService.addToWishlist(request, authHeader));
    }

    @PostMapping("/remove")
    public ResponseEntity<WishlistResponse> removeFromWishlist(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody WishlistItemRequest request
    ) {
        return ResponseEntity.ok(wishlistService.removeFromWishlist(request, authHeader));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<WishlistResponse> clearWishlist(
            @RequestHeader("Authorization") String authHeader
    ) {
        return ResponseEntity.ok(wishlistService.clearWishlist(authHeader));
    }

    @PostMapping("/merge")
    public ResponseEntity<WishlistResponse> mergeWishlist(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody List<WishlistItemRequest> requests
    ) {
        return ResponseEntity.ok(wishlistService.mergeWishlist(requests, authHeader));
    }
}
