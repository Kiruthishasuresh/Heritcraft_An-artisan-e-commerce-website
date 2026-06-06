package com.heritcraft.productservice.repository;

import com.heritcraft.productservice.entity.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {

    // --- Public-facing queries (filtered by approved seller IDs) ---
    List<Product> findBySellerIdIn(Collection<Long> sellerIds);
    List<Product> findByCategoryAndSellerIdIn(String category, Collection<Long> sellerIds);
    List<Product> findByFeaturedTrueAndSellerIdIn(Collection<Long> sellerIds);
    List<Product> findByNameContainingIgnoreCaseAndSellerIdIn(String name, Collection<Long> sellerIds);

    // --- Existing queries (preserved for backward compat) ---
    List<Product> findByCategory(String category);
    List<Product> findBySellerId(Long sellerId);
}