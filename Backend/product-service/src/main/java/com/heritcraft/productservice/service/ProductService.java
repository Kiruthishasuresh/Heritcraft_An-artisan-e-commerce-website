package com.heritcraft.productservice.service;

import com.heritcraft.productservice.dto.AuthUserResponse;
import com.heritcraft.productservice.dto.MediaItemDto;
import com.heritcraft.productservice.dto.ProductRequest;
import com.heritcraft.productservice.dto.ProductResponse;
import com.heritcraft.productservice.dto.SellerProfileSyncRequest;
import com.heritcraft.productservice.entity.Product;
import com.heritcraft.productservice.entity.ProductMedia;
import com.heritcraft.productservice.repository.ProductRepository;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String USER_SERVICE_ME_URL =
            "http://127.0.0.1:8081/api/auth/me";

    // Categories that support sizes (clothing)
    private static final Set<String> SIZE_CATEGORIES = Set.of(
            "shirt", "kurti", "blouse", "t-shirt", "dress", "skirt",
            "kids wear", "pant", "jacket", "handmade clothes", "textiles"
    );

    // Product types that support sizes
    private static final Set<String> SIZE_PRODUCT_TYPES = Set.of(
            "shirt", "kurti", "blouse", "t-shirt", "dress", "skirt",
            "kids wear", "pant", "jacket"
    );

    // Categories that support weights (food/consumable)
    private static final Set<String> WEIGHT_CATEGORIES = Set.of(
            "handmade snacks", "food", "pickles", "powders", "consumables"
    );

    // Product types that support weights
    private static final Set<String> WEIGHT_PRODUCT_TYPES = Set.of(
            "snacks", "food", "pickles", "powders", "consumable"
    );

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // ===================== WRITE OPERATIONS =====================

    public ProductResponse addProduct(ProductRequest request, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);

        if (!user.isActive()) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "User account is disabled");
        }

        if ("seller".equalsIgnoreCase(user.getRole())) {
            if (!user.isApproved()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Seller account is not approved by admin");
            }

            request.setSellerId(user.getId());
            request.setSellerName(user.getName());
            request.setSellerShopName(user.getShopName());
            request.setSellerProfileImage(user.getProfileImage());
        } else if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only seller or admin can add products");
        }

        Product product = new Product();
        updateProductFields(product, request);

        // Set approved status on creation
        product.setSellerApproved(user.isApproved());
        product.setApproved(false); // require admin product approval
        product.onCreate();

        Product savedProduct = productRepository.save(product);
        return mapToResponse(savedProduct);
    }

    public ProductResponse editProduct(String id, ProductRequest request, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        if ("seller".equalsIgnoreCase(user.getRole())) {
            if (!user.isApproved()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Seller account is not approved by admin");
            }

            if (!product.getSellerId().equals(user.getId())) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Seller can edit only own products");
            }

            request.setSellerId(user.getId());
            request.setSellerName(user.getName());
            request.setSellerShopName(user.getShopName());
            request.setSellerProfileImage(user.getProfileImage());
        } else if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only seller or admin can edit products");
        }

        updateProductFields(product, request);
        product.setSellerApproved(user.isApproved()); // update approval status
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            product.setApproved(false); // require admin re-approval if seller edits
        }

        Product savedProduct = productRepository.save(product);
        return mapToResponse(savedProduct);
    }

    public void deleteProduct(String id, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        if ("seller".equalsIgnoreCase(user.getRole())) {
            if (!user.isApproved()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Seller account is not approved by admin");
            }

            if (!product.getSellerId().equals(user.getId())) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Seller can delete only own products");
            }
        } else if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only seller or admin can delete products");
        }

        productRepository.deleteById(id);
    }

    public Map<String, Object> syncSellerProfile(Long sellerId, SellerProfileSyncRequest request, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);

        // Verify caller is the same seller or an admin
        if ("seller".equalsIgnoreCase(user.getRole())) {
            if (!user.getId().equals(sellerId)) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN, "You can only sync your own products");
            }
        } else if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Only seller or admin can sync seller profile");
        }

        List<Product> products = productRepository.findBySellerId(sellerId);

        for (Product product : products) {
            if (request.getSellerName() != null) {
                product.setSellerName(request.getSellerName());
            }
            if (request.getSellerShopName() != null) {
                product.setSellerShopName(request.getSellerShopName());
            }
            if (request.getSellerProfileImage() != null) {
                product.setSellerProfileImage(request.getSellerProfileImage());
            }
        }

        productRepository.saveAll(products);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Seller profile synced successfully");
        result.put("updatedCount", products.size());
        return result;
    }

    // ===================== PUBLIC READ OPERATIONS (approved only) =====================

    /**
     * Get all approved products — used by home page, products page, search.
     * Only returns products from approved sellers.
     */
    public List<ProductResponse> getAllProducts() {
        List<Long> approvedSellerIds = getApprovedSellerIds();
        return productRepository.findBySellerIdIn(approvedSellerIds).stream()
                .filter(Product::isApproved)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get single product by ID — public endpoint.
     * Throws 403 Forbidden if the seller is not approved or product not approved.
     */
    public ProductResponse getProductById(String id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        List<Long> approvedSellerIds = getApprovedSellerIds();
        if (!approvedSellerIds.contains(product.getSellerId())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Seller account is not approved by admin");
        }
        if (!product.isApproved()) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Product is pending admin approval");
        }
        return mapToResponse(product);
    }

    /**
     * Get products by category — approved only for public display.
     */
    public List<ProductResponse> getProductsByCategory(String category) {
        List<Long> approvedSellerIds = getApprovedSellerIds();
        return productRepository.findByCategoryAndSellerIdIn(category, approvedSellerIds).stream()
                .filter(Product::isApproved)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get featured products — approved only.
     */
    public List<ProductResponse> getFeaturedProducts() {
        List<Long> approvedSellerIds = getApprovedSellerIds();
        return productRepository.findByFeaturedTrueAndSellerIdIn(approvedSellerIds).stream()
                .filter(Product::isApproved)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Search products by name — approved only.
     */
    public List<ProductResponse> searchProducts(String query) {
        if (query == null || query.isBlank()) {
            return getAllProducts();
        }
        List<Long> approvedSellerIds = getApprovedSellerIds();
        return productRepository.findByNameContainingIgnoreCaseAndSellerIdIn(query, approvedSellerIds).stream()
                .filter(Product::isApproved)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ===================== SELLER-SPECIFIC READ OPERATIONS =====================

    /**
     * Get products by seller - returns ALL products (including unapproved) with authorization check.
     */
    public List<ProductResponse> getProductsBySeller(Long sellerId, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getId().equals(sellerId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, 
                    "Access denied: You are not authorized to view these products"
            );
        }
        return productRepository.findBySellerId(sellerId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all distinct categories from MongoDB.
     */
    public List<String> getCategories() {
        return productRepository.findAll().stream()
                .map(Product::getCategory)
                .filter(category -> category != null && !category.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    // ===================== ADMIN OPERATIONS =====================

    /**
     * Get all products (including unapproved) — admin only.
     */
    public List<ProductResponse> getAllProductsAdmin(String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Admin role required.");
        }
        return productRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ProductResponse approveProduct(String id, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Only admins can approve products"
            );
        }
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        product.setApproved(true);
        Product saved = productRepository.save(product);
        return mapToResponse(saved);
    }

    public ProductResponse rejectProduct(String id, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Only admins can reject products"
            );
        }
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        product.setApproved(false);
        Product saved = productRepository.save(product);
        return mapToResponse(saved);
    }

    public void updateSellerApproval(Long sellerId, boolean approved, String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Only admins can update seller approval status"
            );
        }
        List<Product> products = productRepository.findBySellerId(sellerId);
        for (Product p : products) {
            p.setSellerApproved(approved);
        }
        productRepository.saveAll(products);
    }

    // ===================== PRIVATE HELPERS =====================

    private List<Long> getApprovedSellerIds() {
        try {
            ResponseEntity<Long[]> response = restTemplate.getForEntity(
                    "http://127.0.0.1:8081/api/users/approved-sellers",
                    Long[].class
            );
            Long[] ids = response.getBody();
            return ids != null ? Arrays.asList(ids) : List.of();
        } catch (Exception e) {
            System.err.println("Error fetching approved sellers: " + e.getMessage());
            return List.of();
        }
    }

    private AuthUserResponse getLoggedInUser(String authHeader) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", authHeader);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<AuthUserResponse> response =
                    restTemplate.exchange(
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

    private void updateProductFields(Product product, ProductRequest request) {
        product.setName(request.getName());
        product.setCategory(request.getCategory());
        product.setProductType(request.getProductType());
        product.setPrice(request.getPrice());
        product.setOldPrice(request.getOldPrice());
        product.setStock(request.getStock());
        product.setDescription(request.getDescription());
        product.setHandmadeStory(request.getHandmadeStory());
        product.setMaterial(request.getMaterial());
        product.setDeliveryTime(request.getDeliveryTime());
        product.setFeatured(request.isFeatured());
        product.setSellerId(request.getSellerId());
        product.setSellerName(request.getSellerName());
        product.setSellerShopName(request.getSellerShopName());
        product.setSellerProfileImage(request.getSellerProfileImage());

        if (product.getSoldQuantity() == null) {
            product.setSoldQuantity(0);
        }

        product.setMakingVideoUrl(request.getMakingVideoUrl());
        product.setMakingVideoTitle(request.getMakingVideoTitle());

        // Dynamic size/weight based on category AND productType
        String category = request.getCategory() != null ? request.getCategory().toLowerCase() : "";
        String productType = request.getProductType() != null ? request.getProductType().toLowerCase() : "";

        boolean supportsSize = SIZE_CATEGORIES.contains(category) || SIZE_PRODUCT_TYPES.contains(productType)
                || isType(productType, "shirt", "kurti", "blouse", "t-shirt", "dress", "skirt", "pant", "kids wear", "jacket");
        boolean supportsWeight = WEIGHT_CATEGORIES.contains(category) || WEIGHT_PRODUCT_TYPES.contains(productType)
                || isType(productType, "snacks", "pickles", "food", "powders", "consumable products", "consumables", "consumable");
        boolean supportsLength = isType(productType, "saree", "dupatta", "fabric", "shawl", "scarf");
        boolean supportsVolume = isType(productType, "oil", "juice", "liquid products", "liquid");
        boolean supportsQuantity = isType(productType, "jewellery", "accessories", "pots", "crafts", "home decor");

        product.setSizes(supportsSize && request.getSizes() != null ? request.getSizes() : new ArrayList<>());
        product.setWeights(supportsWeight && request.getWeights() != null ? request.getWeights() : new ArrayList<>());
        product.setLengths(supportsLength && request.getLengths() != null ? request.getLengths() : new ArrayList<>());
        product.setVolumes(supportsVolume && request.getVolumes() != null ? request.getVolumes() : new ArrayList<>());
        product.setQuantities(supportsQuantity && request.getQuantities() != null ? request.getQuantities() : new ArrayList<>());

        product.getMedia().clear();

        if (request.getMedia() != null) {
            for (MediaItemDto mDto : request.getMedia()) {
                ProductMedia pm = new ProductMedia();
                pm.setUrl(mDto.getUrl());
                pm.setType(mDto.getType());
                pm.setName(mDto.getName());
                product.getMedia().add(pm);
            }
        }

        product.calculateOffer();
    }

    private ProductResponse mapToResponse(Product product) {
        ProductResponse response = new ProductResponse();

        response.setId(product.getId());
        response.set_id(product.getId());
        response.setName(product.getName());
        response.setCategory(product.getCategory());
        response.setProductType(product.getProductType());
        response.setPrice(product.getPrice());
        response.setOldPrice(product.getOldPrice());
        response.setStock(product.getStock());
        response.setSoldQuantity(product.getSoldQuantity());
        response.setDescription(product.getDescription());
        response.setHandmadeStory(product.getHandmadeStory());
        response.setMaterial(product.getMaterial());
        response.setDeliveryTime(product.getDeliveryTime());
        response.setFeatured(product.isFeatured());
        response.setSellerId(product.getSellerId());
        response.setSellerName(product.getSellerName());
        response.setSellerShopName(product.getSellerShopName());
        response.setSellerApproved(product.isSellerApproved());
        response.setApproved(product.isApproved());
        response.setSellerProfileImage(product.getSellerProfileImage());
        response.setAverageRating(product.getAverageRating());
        response.setNumReviews(product.getNumReviews());
        response.setOffer(product.getOffer());
        response.setCreatedAt(product.getCreatedAt());

        ProductResponse.SellerInfo sellerInfo = new ProductResponse.SellerInfo();
        sellerInfo.setSellerId(product.getSellerId());
        sellerInfo.setName(product.getSellerName());
        sellerInfo.setShopName(product.getSellerShopName());
        sellerInfo.setApproved(product.isSellerApproved());
        sellerInfo.setProfileImage(product.getSellerProfileImage());
        response.setSeller(sellerInfo);

        List<String> images = new ArrayList<>();
        List<String> videos = new ArrayList<>();

        if (product.getMedia() != null) {
            for (ProductMedia pm : product.getMedia()) {
                String type = pm.getType() != null ? pm.getType().toLowerCase() : "";

                if (type.startsWith("image")) {
                    images.add(pm.getUrl());
                } else if (type.startsWith("video")) {
                    videos.add(pm.getUrl());
                } else {
                    images.add(pm.getUrl());
                }
            }
        }

        response.setImages(images);
        response.setVideos(videos);
        response.setSizes(product.getSizes());
        response.setWeights(product.getWeights());
        response.setLengths(product.getLengths());
        response.setVolumes(product.getVolumes());
        response.setQuantities(product.getQuantities());
        response.setMakingVideoUrl(product.getMakingVideoUrl());
        response.setMakingVideoTitle(product.getMakingVideoTitle());

        return response;
    }

    private boolean isType(String value, String... types) {
        if (value == null) return false;
        String valLower = value.trim().toLowerCase();
        for (String t : types) {
            if (valLower.equals(t.toLowerCase())) return true;
        }
        return false;
    }
}