package com.heritcraft.productservice.service;

import com.heritcraft.productservice.dto.AuthUserResponse;
import com.heritcraft.productservice.dto.WishlistItemRequest;
import com.heritcraft.productservice.dto.WishlistItemResponse;
import com.heritcraft.productservice.dto.WishlistResponse;
import com.heritcraft.productservice.entity.Product;
import com.heritcraft.productservice.entity.ProductMedia;
import com.heritcraft.productservice.entity.Wishlist;
import com.heritcraft.productservice.entity.WishlistItem;
import com.heritcraft.productservice.repository.ProductRepository;
import com.heritcraft.productservice.repository.WishlistRepository;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String USER_SERVICE_ME_URL = "http://127.0.0.1:8081/api/auth/me";

    public WishlistService(WishlistRepository wishlistRepository, ProductRepository productRepository) {
        this.wishlistRepository = wishlistRepository;
        this.productRepository = productRepository;
    }

    private AuthUserResponse getLoggedInUser(String authHeader) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", authHeader);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<AuthUserResponse> response = restTemplate.exchange(
                    USER_SERVICE_ME_URL,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    AuthUserResponse.class
            );
            AuthUserResponse user = response.getBody();
            if (user == null) {
                throw new RuntimeException("Invalid user");
            }
            return user;
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Unauthorized. Please login again.");
        }
    }

    private AuthUserResponse validateBuyer(String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"buyer".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only buyers can access wishlist functionality");
        }
        return user;
    }

    public WishlistResponse getWishlist(String authHeader) {
        AuthUserResponse user = validateBuyer(authHeader);
        Wishlist wishlist = wishlistRepository.findByBuyerId(user.getId())
                .orElseGet(() -> {
                    Wishlist w = new Wishlist();
                    w.setBuyerId(user.getId());
                    w.setCreatedAt(LocalDateTime.now());
                    w.setUpdatedAt(LocalDateTime.now());
                    return wishlistRepository.save(w);
                });

        // Refresh product data (stock, price) from ProductRepository
        if (wishlist.getItems() != null) {
            for (WishlistItem item : wishlist.getItems()) {
                Product product = productRepository.findById(item.getProductId()).orElse(null);
                if (product != null) {
                    item.setProductName(product.getName());
                    item.setPrice(product.getPrice());
                    item.setStock(product.getStock());
                    item.setSellerId(product.getSellerId());
                    item.setSellerName(product.getSellerName());
                    item.setSellerShopName(product.getSellerShopName());
                    item.setImage(getFirstImage(product));
                }
            }
            wishlistRepository.save(wishlist);
        }

        return mapToResponse(wishlist);
    }

    public WishlistResponse addToWishlist(WishlistItemRequest request, String authHeader) {
        String productId = request.getProductId();
        AuthUserResponse user = validateBuyer(authHeader);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Product not found"));

        Wishlist wishlist = wishlistRepository.findByBuyerId(user.getId())
                .orElseGet(() -> {
                    Wishlist w = new Wishlist();
                    w.setBuyerId(user.getId());
                    w.setCreatedAt(LocalDateTime.now());
                    w.setUpdatedAt(LocalDateTime.now());
                    return w;
                });

        List<WishlistItem> items = wishlist.getItems();
        if (items == null) {
            items = new ArrayList<>();
            wishlist.setItems(items);
        }

        // Skip if already in wishlist
        boolean alreadyExists = items.stream()
                .anyMatch(item -> item.getProductId().equals(productId));
        if (alreadyExists) {
            return mapToResponse(wishlist);
        }

        WishlistItem newItem = new WishlistItem();
        newItem.setProductId(product.getId());
        newItem.setProductName(product.getName());
        newItem.setImage(getFirstImage(product));
        newItem.setPrice(product.getPrice());
        newItem.setSellerId(product.getSellerId());
        newItem.setSellerName(product.getSellerName());
        newItem.setSellerShopName(product.getSellerShopName());
        newItem.setStock(product.getStock());
        newItem.setAddedAt(LocalDateTime.now());
        items.add(newItem);

        wishlist.setUpdatedAt(LocalDateTime.now());
        return mapToResponse(wishlistRepository.save(wishlist));
    }

    public WishlistResponse removeFromWishlist(WishlistItemRequest request, String authHeader) {
        String productId = request.getProductId();
        AuthUserResponse user = validateBuyer(authHeader);
        Wishlist wishlist = wishlistRepository.findByBuyerId(user.getId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Wishlist not found"));

        List<WishlistItem> items = wishlist.getItems();
        if (items != null) {
            items.removeIf(item -> item.getProductId().equals(productId));
        }

        wishlist.setUpdatedAt(LocalDateTime.now());
        return mapToResponse(wishlistRepository.save(wishlist));
    }

    public WishlistResponse clearWishlist(String authHeader) {
        AuthUserResponse user = validateBuyer(authHeader);
        Wishlist wishlist = wishlistRepository.findByBuyerId(user.getId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Wishlist not found"));

        if (wishlist.getItems() != null) {
            wishlist.getItems().clear();
        }

        wishlist.setUpdatedAt(LocalDateTime.now());
        return mapToResponse(wishlistRepository.save(wishlist));
    }

    public WishlistResponse mergeWishlist(List<WishlistItemRequest> requests, String authHeader) {
        AuthUserResponse user = validateBuyer(authHeader);
        Wishlist wishlist = wishlistRepository.findByBuyerId(user.getId())
                .orElseGet(() -> {
                    Wishlist w = new Wishlist();
                    w.setBuyerId(user.getId());
                    w.setCreatedAt(LocalDateTime.now());
                    w.setUpdatedAt(LocalDateTime.now());
                    return wishlistRepository.save(w);
                });

        List<WishlistItem> items = wishlist.getItems();
        if (items == null) {
            items = new ArrayList<>();
            wishlist.setItems(items);
        }

        if (requests != null) {
            for (WishlistItemRequest req : requests) {
                String productId = req.getProductId();
                if (productId == null) {
                    continue;
                }

                Product product = productRepository.findById(productId).orElse(null);
                if (product == null) {
                    continue;
                }

                // Add only if not already present
                final String pid = productId;
                boolean alreadyExists = items.stream()
                        .anyMatch(item -> item.getProductId().equals(pid));
                if (alreadyExists) {
                    continue;
                }

                WishlistItem newItem = new WishlistItem();
                newItem.setProductId(product.getId());
                newItem.setProductName(product.getName());
                newItem.setImage(getFirstImage(product));
                newItem.setPrice(product.getPrice());
                newItem.setSellerId(product.getSellerId());
                newItem.setSellerName(product.getSellerName());
                newItem.setSellerShopName(product.getSellerShopName());
                newItem.setStock(product.getStock());
                newItem.setAddedAt(LocalDateTime.now());
                items.add(newItem);
            }
        }

        wishlist.setUpdatedAt(LocalDateTime.now());
        return mapToResponse(wishlistRepository.save(wishlist));
    }

    private String getFirstImage(Product product) {
        if (product.getMedia() != null) {
            for (ProductMedia pm : product.getMedia()) {
                String type = pm.getType() != null ? pm.getType().toLowerCase() : "";
                if (!type.startsWith("video")) {
                    return pm.getUrl();
                }
            }
        }
        return null;
    }

    private WishlistResponse mapToResponse(Wishlist wishlist) {
        if (wishlist == null) {
            return null;
        }
        WishlistResponse response = new WishlistResponse();
        response.setId(wishlist.getId());
        response.setBuyerId(wishlist.getBuyerId());
        response.setCreatedAt(wishlist.getCreatedAt());
        response.setUpdatedAt(wishlist.getUpdatedAt());

        List<WishlistItemResponse> itemResponses = new ArrayList<>();
        if (wishlist.getItems() != null) {
            for (WishlistItem item : wishlist.getItems()) {
                WishlistItemResponse ir = new WishlistItemResponse();
                ir.setProductId(item.getProductId());
                ir.setProductName(item.getProductName());
                ir.setImage(item.getImage());
                ir.setPrice(item.getPrice());
                ir.setSellerId(item.getSellerId());
                ir.setSellerName(item.getSellerName());
                ir.setSellerShopName(item.getSellerShopName());
                ir.setStock(item.getStock());
                ir.setAddedAt(item.getAddedAt());
                itemResponses.add(ir);
            }
        }
        response.setItems(itemResponses);
        return response;
    }
}
