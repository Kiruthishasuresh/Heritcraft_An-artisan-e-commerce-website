package com.heritcraft.productservice.controller;

import com.heritcraft.productservice.dto.*;
import com.heritcraft.productservice.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /**
     * POST /api/reviews — Add a review (auth required, must have delivered order)
     */
    @PostMapping
    public ResponseEntity<ReviewResponse> addReview(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ReviewRequest request
    ) {
        return new ResponseEntity<>(
                reviewService.addReview(request, authHeader),
                HttpStatus.CREATED
        );
    }

    /**
     * GET /api/reviews/product/{productId} — Get all public visible/approved reviews for a product
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByProduct(@PathVariable String productId) {
        return ResponseEntity.ok(reviewService.getReviewsByProduct(productId));
    }

    /**
     * GET /api/reviews/buyer/{buyerId} — Get reviews written by a specific buyer
     */
    @GetMapping("/buyer/{buyerId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByBuyer(@PathVariable Long buyerId) {
        return ResponseEntity.ok(reviewService.getReviewsByBuyer(buyerId));
    }

    /**
     * GET /api/reviews/seller/{sellerId} — Get all reviews for a seller's products
     */
    @GetMapping("/seller/{sellerId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsBySeller(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId
    ) {
        return ResponseEntity.ok(reviewService.getReviewsBySeller(sellerId, authHeader));
    }

    /**
     * GET /api/reviews/seller/{sellerId}/stats — Get review statistics for a seller
     */
    @GetMapping("/seller/{sellerId}/stats")
    public ResponseEntity<SellerReviewStats> getSellerStats(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId
    ) {
        return ResponseEntity.ok(reviewService.getSellerStats(sellerId, authHeader));
    }

    /**
     * POST /api/reviews/{reviewId}/seller-reply — Seller reply to a review
     */
    @PostMapping("/{reviewId}/seller-reply")
    public ResponseEntity<ReviewResponse> replyAsSeller(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reviewId,
            @Valid @RequestBody SellerReplyRequest request
    ) {
        return ResponseEntity.ok(reviewService.replyAsSeller(reviewId, request, authHeader));
    }

    /**
     * POST /api/reviews/{reviewId}/report — Seller reports inappropriate review
     */
    @PostMapping("/{reviewId}/report")
    public ResponseEntity<ReviewResponse> reportReview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reviewId,
            @Valid @RequestBody SellerReportRequest request
    ) {
        return ResponseEntity.ok(reviewService.reportReview(reviewId, request, authHeader));
    }

    /**
     * GET /api/reviews/admin/all — Get all platform reviews (admin only)
     */
    @GetMapping("/admin/all")
    public ResponseEntity<List<ReviewResponse>> getAllReviewsForAdmin(
            @RequestHeader("Authorization") String authHeader
    ) {
        return ResponseEntity.ok(reviewService.getAllReviewsForAdmin(authHeader));
    }

    /**
     * GET /api/reviews/admin/stats — Get platform-wide review stats (admin only)
     */
    @GetMapping("/admin/stats")
    public ResponseEntity<AdminReviewStats> getAdminStats(
            @RequestHeader("Authorization") String authHeader
    ) {
        return ResponseEntity.ok(reviewService.getAdminStats(authHeader));
    }

    /**
     * PUT /api/reviews/admin/{reviewId}/status — Admin updates review status
     */
    @PutMapping("/admin/{reviewId}/status")
    public ResponseEntity<ReviewResponse> updateReviewStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reviewId,
            @Valid @RequestBody ReviewStatusRequest request
    ) {
        return ResponseEntity.ok(reviewService.updateReviewStatus(reviewId, request, authHeader));
    }

    /**
     * DELETE /api/reviews/admin/{reviewId} — Admin soft deletes a review
     */
    @DeleteMapping("/admin/{reviewId}")
    public ResponseEntity<Void> deleteReviewAdmin(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reviewId
    ) {
        reviewService.deleteReviewAdmin(reviewId, authHeader);
        return ResponseEntity.noContent().build();
    }

    /**
     * PUT /api/reviews/admin/{reviewId}/restore — Admin restores hidden/deleted review
     */
    @PutMapping("/admin/{reviewId}/restore")
    public ResponseEntity<ReviewResponse> restoreReviewAdmin(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reviewId
    ) {
        return ResponseEntity.ok(reviewService.restoreReviewAdmin(reviewId, authHeader));
    }

    /**
     * DELETE /api/reviews/{id} — Delete a review (owner or admin only)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id
    ) {
        reviewService.deleteReview(id, authHeader);
        return ResponseEntity.noContent().build();
    }
    
}
