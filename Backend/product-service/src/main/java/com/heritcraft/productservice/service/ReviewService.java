package com.heritcraft.productservice.service;

import com.heritcraft.productservice.dto.*;
import com.heritcraft.productservice.entity.Order;
import com.heritcraft.productservice.entity.Product;
import com.heritcraft.productservice.entity.Review;
import com.heritcraft.productservice.repository.OrderRepository;
import com.heritcraft.productservice.repository.ProductRepository;
import com.heritcraft.productservice.repository.ReviewRepository;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String USER_SERVICE_ME_URL =
            "http://127.0.0.1:8081/api/auth/me";

    public ReviewService(
            ReviewRepository reviewRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository
    ) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }

    /**
     * Add a review — only allowed for buyers who have a DELIVERED order containing this product.
     * Prevents duplicate reviews (one review per user per product per order).
     */
    public ReviewResponse addReview(ReviewRequest request, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);

        if (!user.isActive()) {
            throw new RuntimeException("User account is disabled");
        }

        if ("seller".equalsIgnoreCase(user.getRole()) || "admin".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Sellers and Admins cannot add product reviews");
        }

        // Check product exists
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Verify order exists, belongs to user, contains the product, and is delivered
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getUserId().equals(user.getId())) {
            throw new RuntimeException("This order does not belong to you");
        }

        if (!"DELIVERED".equalsIgnoreCase(order.getOrderStatus())) {
            throw new RuntimeException("You can only review products from delivered orders");
        }

        boolean itemFound = order.getItems().stream()
                .anyMatch(item -> request.getProductId().equals(item.getProductId()));
        if (!itemFound) {
            throw new RuntimeException("This product is not part of the specified order");
        }

        // Check for duplicate review for this order item
        if (reviewRepository.existsByProductIdAndUserIdAndOrderId(request.getProductId(), user.getId(), request.getOrderId())) {
            throw new RuntimeException("You have already reviewed this product for this order");
        }

        // Create review
        Review review = new Review();
        review.setProductId(request.getProductId());
        review.setProductName(product.getName());
        review.setProductImage((product.getMedia() != null && !product.getMedia().isEmpty()) ? product.getMedia().get(0).getUrl() : "");
        review.setSellerId(product.getSellerId());
        review.setSellerName(product.getSellerName());
        review.setSellerShopName(product.getSellerShopName());
        review.setUserId(user.getId());
        review.setUserName(user.getName());
        review.setBuyerEmail(user.getEmail());
        review.setOrderId(request.getOrderId());
        review.setRating(request.getRating() != null ? request.getRating() : 5);
        review.setComment(request.getComment());
        review.setImages(request.getImages() != null ? request.getImages() : List.of());
        review.setStatus("VISIBLE");
        review.onCreate();

        Review savedReview = reviewRepository.save(review);

        // Update product average rating and review count
        updateProductRating(request.getProductId());

        return mapToResponse(savedReview);
    }

    /**
     * Get all public visible/approved reviews for a product (null status treated as VISIBLE).
     */
    public List<ReviewResponse> getReviewsByProduct(String productId) {
        List<Review> reviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
        return reviews.stream()
                .filter(r -> r.getStatus() == null || r.getStatus().isBlank() || "VISIBLE".equalsIgnoreCase(r.getStatus()) || "APPROVED".equalsIgnoreCase(r.getStatus()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get reviews written by buyer.
     */
    public List<ReviewResponse> getReviewsByBuyer(Long buyerId) {
        List<Review> reviews = reviewRepository.findByUserIdOrderByCreatedAtDesc(buyerId);
        return reviews.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /**
     * Get reviews for seller's own products (resolving missing seller ID on old reviews in-memory).
     */
    public List<ReviewResponse> getReviewsBySeller(Long sellerId, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if ("seller".equalsIgnoreCase(user.getRole()) && !user.getId().equals(sellerId)) {
            throw new RuntimeException("Access denied: You can only view reviews for your own products");
        }
        List<Review> allReviews = reviewRepository.findAll();
        return allReviews.stream()
                .map(this::mapToResponse)
                .filter(res -> sellerId.equals(res.getSellerId()))
                .sorted((r1, r2) -> {
                    LocalDateTime t1 = r1.getCreatedAt() != null ? r1.getCreatedAt() : LocalDateTime.MIN;
                    LocalDateTime t2 = r2.getCreatedAt() != null ? r2.getCreatedAt() : LocalDateTime.MIN;
                    return t2.compareTo(t1);
                })
                .collect(Collectors.toList());
    }

    /**
     * Get seller review stats (never divide by zero, safely map rating).
     */
    public SellerReviewStats getSellerStats(Long sellerId, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if ("seller".equalsIgnoreCase(user.getRole()) && !user.getId().equals(sellerId)) {
            throw new RuntimeException("Access denied: You can only view stats for your own products");
        }
        List<ReviewResponse> sellerReviews = reviewRepository.findAll().stream()
                .map(this::mapToResponse)
                .filter(res -> sellerId.equals(res.getSellerId()))
                .collect(Collectors.toList());

        long total = sellerReviews.size();
        double avg = 0.0;
        long five = 0, four = 0, three = 0, two = 0, one = 0;
        if (total > 0) {
            long ratingSum = 0;
            long ratedCount = 0;
            for (ReviewResponse r : sellerReviews) {
                if (r.getRating() != null) {
                    int stars = r.getRating();
                    ratingSum += stars;
                    ratedCount++;
                    if (stars == 5) five++;
                    else if (stars == 4) four++;
                    else if (stars == 3) three++;
                    else if (stars == 2) two++;
                    else if (stars == 1) one++;
                }
            }
            if (ratedCount > 0) {
                avg = (double) ratingSum / ratedCount;
                avg = Math.round(avg * 10.0) / 10.0;
            }
        }
        return new SellerReviewStats(sellerId, total, avg, five, four, three, two, one);
    }

    /**
     * Seller reply to a review.
     */
    public ReviewResponse replyAsSeller(String reviewId, SellerReplyRequest request, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (!"seller".equalsIgnoreCase(user.getRole()) && !"admin".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Only sellers can reply to reviews");
        }

        ReviewResponse responseModel = mapToResponse(review);
        if ("seller".equalsIgnoreCase(user.getRole()) && !user.getId().equals(responseModel.getSellerId())) {
            throw new RuntimeException("Access denied: You can only reply to reviews for your own products");
        }

        review.setSellerReply(request.getReply());
        review.setSellerReplyAt(LocalDateTime.now());
        review.onUpdate();
        Review saved = reviewRepository.save(review);
        return mapToResponse(saved);
    }

    /**
     * Seller reports inappropriate review.
     */
    public ReviewResponse reportReview(String reviewId, SellerReportRequest request, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (!"seller".equalsIgnoreCase(user.getRole()) && !"admin".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Only sellers can report reviews");
        }

        ReviewResponse responseModel = mapToResponse(review);
        if ("seller".equalsIgnoreCase(user.getRole()) && !user.getId().equals(responseModel.getSellerId())) {
            throw new RuntimeException("Access denied: You can only report reviews for your own products");
        }

        review.setStatus("REPORTED");
        review.setReportedReason(request.getReason());
        review.setReportedAt(LocalDateTime.now());
        review.onUpdate();
        Review saved = reviewRepository.save(review);

        // Recalculate product rating since status has changed
        updateProductRating(review.getProductId());

        return mapToResponse(saved);
    }

    /**
     * Admin: Get all platform reviews.
     */
    public List<ReviewResponse> getAllReviewsForAdmin(String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Access denied: Admin role required");
        }
        List<Review> reviews = reviewRepository.findAll();
        return reviews.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /**
     * Admin: Get platform review stats (never divide by zero, safely map rating).
     */
    public AdminReviewStats getAdminStats(String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Access denied: Admin role required");
        }
        List<ReviewResponse> reviews = reviewRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        long total = reviews.size();
        double avg = 0.0;
        long visible = 0, hidden = 0, reported = 0;
        long five = 0, four = 0, three = 0, two = 0, one = 0;
        if (total > 0) {
            long ratingSum = 0;
            long ratedCount = 0;
            for (ReviewResponse r : reviews) {
                String status = r.getStatus();
                if ("VISIBLE".equalsIgnoreCase(status) || "APPROVED".equalsIgnoreCase(status)) {
                    visible++;
                } else if ("HIDDEN".equalsIgnoreCase(status)) {
                    hidden++;
                } else if ("REPORTED".equalsIgnoreCase(status)) {
                    reported++;
                }

                if (r.getRating() != null) {
                    int stars = r.getRating();
                    ratingSum += stars;
                    ratedCount++;
                    if (stars == 5) five++;
                    else if (stars == 4) four++;
                    else if (stars == 3) three++;
                    else if (stars == 2) two++;
                    else if (stars == 1) one++;
                }
            }
            if (ratedCount > 0) {
                avg = (double) ratingSum / ratedCount;
                avg = Math.round(avg * 10.0) / 10.0;
            }
        }
        return new AdminReviewStats(total, avg, visible, hidden, reported, five, four, three, two, one);
    }

    /**
     * Admin: Update review status.
     */
    public ReviewResponse updateReviewStatus(String reviewId, ReviewStatusRequest request, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Access denied: Admin role required");
        }
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setStatus(request.getStatus());
        review.setAdminNote(request.getAdminNote());
        if ("HIDDEN".equalsIgnoreCase(request.getStatus())) {
            review.setHiddenAt(LocalDateTime.now());
        }
        review.onUpdate();
        Review saved = reviewRepository.save(review);

        // Recalculate product rating
        updateProductRating(review.getProductId());

        return mapToResponse(saved);
    }

    /**
     * Admin: Soft delete a review (sets status to DELETED).
     */
    public void deleteReviewAdmin(String reviewId, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Access denied: Admin role required");
        }
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setStatus("DELETED");
        review.setDeletedAt(LocalDateTime.now());
        review.onUpdate();
        reviewRepository.save(review);

        // Recalculate product rating
        updateProductRating(review.getProductId());
    }

    /**
     * Admin: Restore a hidden/deleted review (sets status to VISIBLE).
     */
    public ReviewResponse restoreReviewAdmin(String reviewId, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Access denied: Admin role required");
        }
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setStatus("VISIBLE");
        review.onUpdate();
        Review saved = reviewRepository.save(review);

        // Recalculate product rating
        updateProductRating(review.getProductId());

        return mapToResponse(saved);
    }

    /**
     * Delete review — buyer deleting their own review.
     */
    public void deleteReview(String reviewId, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (!review.getUserId().equals(user.getId()) && !"admin".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("You can only delete your own reviews");
        }

        String productId = review.getProductId();
        reviewRepository.deleteById(reviewId);

        // Recalculate product rating
        updateProductRating(productId);
    }

    /**
     * Recalculate average rating and review count for a product based only on VISIBLE/APPROVED reviews.
     */
    private void updateProductRating(String productId) {
        List<Review> reviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId).stream()
                .filter(r -> r.getStatus() == null || r.getStatus().isBlank() || "VISIBLE".equalsIgnoreCase(r.getStatus()) || "APPROVED".equalsIgnoreCase(r.getStatus()))
                .collect(Collectors.toList());

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return;

        long total = reviews.size();
        if (total == 0) {
            product.setAverageRating(0.0);
            product.setNumReviews(0);
        } else {
            long ratingSum = 0;
            long ratedCount = 0;
            for (Review r : reviews) {
                if (r.getRating() != null) {
                    ratingSum += r.getRating();
                    ratedCount++;
                }
            }
            if (ratedCount > 0) {
                double avg = (double) ratingSum / ratedCount;
                product.setAverageRating(Math.round(avg * 10.0) / 10.0);
            } else {
                product.setAverageRating(0.0);
            }
            product.setNumReviews((int) total);
        }

        productRepository.save(product);
    }

    private ReviewResponse mapToResponse(Review review) {
        ReviewResponse res = new ReviewResponse();
        res.setId(review.getId());
        res.setProductId(review.getProductId());

        Product product = null;
        if (review.getProductId() != null && !review.getProductId().isBlank()) {
            try {
                product = productRepository.findById(review.getProductId()).orElse(null);
            } catch (Exception e) {
                // Ignore search failures for malformed IDs
            }
        }

        String productName = review.getProductName() != null ? review.getProductName() : (product != null ? product.getName() : "Unknown Product");
        String productImage = review.getProductImage() != null ? review.getProductImage() : (product != null && product.getMedia() != null && !product.getMedia().isEmpty() ? product.getMedia().get(0).getUrl() : null);
        Long sellerId = review.getSellerId() != null ? review.getSellerId() : (product != null ? product.getSellerId() : null);
        String sellerName = review.getSellerName() != null ? review.getSellerName() : (product != null ? product.getSellerName() : "Unknown Seller");
        String sellerShopName = review.getSellerShopName() != null ? review.getSellerShopName() : (product != null ? product.getSellerShopName() : "Unknown Shop");

        res.setProductName(productName);
        res.setProductImage(productImage);
        res.setSellerId(sellerId);
        res.setSellerName(sellerName);
        res.setSellerShopName(sellerShopName);

        res.setUserId(review.getUserId());
        res.setUserName(review.getUserName() != null ? review.getUserName() : "Anonymous Buyer");
        res.setBuyerEmail(review.getBuyerEmail() != null ? review.getBuyerEmail() : "");
        res.setOrderId(review.getOrderId() != null ? review.getOrderId() : "");
        res.setRating(review.getRating() != null ? review.getRating() : 0);
        res.setComment(review.getComment() != null ? review.getComment() : "");
        res.setImages(review.getImages() != null ? review.getImages() : List.of());

        String status = review.getStatus();
        if (status == null || status.isBlank()) {
            status = "VISIBLE";
        }
        res.setStatus(status);

        res.setAdminNote(review.getAdminNote());
        res.setSellerReply(review.getSellerReply());
        res.setSellerReplyAt(review.getSellerReplyAt());
        res.setReportedReason(review.getReportedReason());
        res.setReportedAt(review.getReportedAt());
        res.setHiddenAt(review.getHiddenAt());
        res.setDeletedAt(review.getDeletedAt());
        res.setCreatedAt(review.getCreatedAt());
        res.setUpdatedAt(review.getUpdatedAt() != null ? review.getUpdatedAt() : review.getCreatedAt());
        return res;
    }

    private AuthUserResponse getLoggedInUser(String authHeader) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", authHeader);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<AuthUserResponse> response =
                    restTemplate.exchange(
                            USER_SERVICE_ME_URL,
                            HttpMethod.GET,
                            entity,
                            AuthUserResponse.class
                    );

            AuthUserResponse user = response.getBody();

            if (user == null) {
                throw new RuntimeException("Invalid user");
            }

            return user;
        } catch (Exception e) {
            throw new RuntimeException("Unauthorized. Please login again.");
        }
    }
}
