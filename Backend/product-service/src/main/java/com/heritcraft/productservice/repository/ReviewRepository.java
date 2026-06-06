package com.heritcraft.productservice.repository;

import com.heritcraft.productservice.entity.Review;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByProductIdOrderByCreatedAtDesc(String productId);
    List<Review> findByProductIdAndStatusInOrderByCreatedAtDesc(String productId, List<String> statuses);
    List<Review> findByUserId(Long userId);
    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Review> findBySellerIdOrderByCreatedAtDesc(Long sellerId);
    List<Review> findBySellerId(Long sellerId);
    boolean existsByProductIdAndUserId(String productId, Long userId);
    boolean existsByProductIdAndUserIdAndOrderId(String productId, Long userId, String orderId);
    
    long countBySellerId(Long sellerId);
    long countBySellerIdAndRating(Long sellerId, Integer rating);
    long countByRating(Integer rating);
    long countByStatus(String status);
    long countByRatingAndStatus(Integer rating, String status);
}
