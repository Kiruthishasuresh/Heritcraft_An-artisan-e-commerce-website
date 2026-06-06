package com.heritcraft.productservice.service;

import com.heritcraft.productservice.dto.CartItemRequest;
import com.heritcraft.productservice.dto.CartItemResponse;
import com.heritcraft.productservice.dto.CartResponse;
import com.heritcraft.productservice.dto.ProductResponse;
import com.heritcraft.productservice.dto.AuthUserResponse;
import com.heritcraft.productservice.entity.Cart;
import com.heritcraft.productservice.entity.CartItem;
import com.heritcraft.productservice.entity.Product;
import com.heritcraft.productservice.entity.ProductMedia;
import com.heritcraft.productservice.repository.CartRepository;
import com.heritcraft.productservice.repository.ProductRepository;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String USER_SERVICE_ME_URL = "http://127.0.0.1:8081/api/auth/me";

    public CartService(CartRepository cartRepository, ProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
    }

    private AuthUserResponse validateCartUser(String authHeader) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"buyer".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only buyers can access cart functionality");
        }
        return user;
    }

    private void validateProductOptions(Product product, CartItemRequest request) {
        // Size validation
        if (product.getSizes() != null && !product.getSizes().isEmpty()) {
            String size = request.getSelectedSize();
            if (size == null || size.trim().isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Size is required for this product: " + product.getName());
            }
            boolean exists = product.getSizes().stream().anyMatch(s -> s.trim().equalsIgnoreCase(size.trim()));
            if (!exists) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid size selected for product: " + product.getName());
            }
        }
        
        // Weight validation
        if (product.getWeights() != null && !product.getWeights().isEmpty()) {
            String weight = request.getSelectedWeight();
            if (weight == null || weight.trim().isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Weight is required for this product: " + product.getName());
            }
            boolean exists = product.getWeights().stream().anyMatch(w -> w.trim().equalsIgnoreCase(weight.trim()));
            if (!exists) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid weight selected for product: " + product.getName());
            }
        }

        // Length validation
        if (product.getLengths() != null && !product.getLengths().isEmpty()) {
            String length = request.getSelectedLength();
            if (length == null || length.trim().isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Length is required for this product: " + product.getName());
            }
            boolean exists = product.getLengths().stream().anyMatch(l -> l.trim().equalsIgnoreCase(length.trim()));
            if (!exists) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid length selected for product: " + product.getName());
            }
        }

        // Volume validation
        if (product.getVolumes() != null && !product.getVolumes().isEmpty()) {
            String volume = request.getSelectedVolume();
            if (volume == null || volume.trim().isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Volume is required for this product: " + product.getName());
            }
            boolean exists = product.getVolumes().stream().anyMatch(v -> v.trim().equalsIgnoreCase(volume.trim()));
            if (!exists) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid volume selected for product: " + product.getName());
            }
        }

        // Quantity option validation
        if (product.getQuantities() != null && !product.getQuantities().isEmpty()) {
            String quantityOption = request.getSelectedQuantityOption();
            if (quantityOption == null || quantityOption.trim().isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Quantity option is required for this product: " + product.getName());
            }
            boolean exists = product.getQuantities().stream().anyMatch(q -> q.trim().equalsIgnoreCase(quantityOption.trim()));
            if (!exists) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid quantity option selected for product: " + product.getName());
            }
        }
    }

    public CartResponse getCart(String authHeader) {
        AuthUserResponse user = validateCartUser(authHeader);
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Cart c = new Cart();
                    c.setUserId(user.getId());
                    c.setId(String.valueOf(user.getId()));
                    return cartRepository.save(c);
                });
        return mapToResponse(cart);
    }

    public CartResponse addToCart(CartItemRequest request, String authHeader) {
        AuthUserResponse user = validateCartUser(authHeader);
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Cart c = new Cart();
                    c.setUserId(user.getId());
                    c.setId(String.valueOf(user.getId()));
                    return c;
                });

        if (request.getProductId() == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Product ID is required");
        }

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Product not found"));

        int qtyToAdd = request.getQuantity() != null ? request.getQuantity() : 1;
        if (qtyToAdd <= 0) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
        }

        validateProductOptions(product, request);

        int stock = product.getStock() != null ? product.getStock() : 0;
        if (stock <= 0) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Product is out of stock");
        }

        List<CartItem> items = cart.getItems();
        if (items == null) {
            items = new ArrayList<>();
            cart.setItems(items);
        }

        Optional<CartItem> existing = items.stream().filter(item -> 
                item.getProductId().equals(request.getProductId()) &&
                nullSafeEquals(item.getSelectedSize(), request.getSelectedSize()) &&
                nullSafeEquals(item.getSelectedWeight(), request.getSelectedWeight()) &&
                nullSafeEquals(item.getSelectedLength(), request.getSelectedLength()) &&
                nullSafeEquals(item.getSelectedVolume(), request.getSelectedVolume()) &&
                nullSafeEquals(item.getSelectedQuantityOption(), request.getSelectedQuantityOption())
        ).findFirst();

        if (existing.isPresent()) {
            CartItem item = existing.get();
            int newQty = item.getQuantity() + qtyToAdd;
            if (newQty > stock) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Cannot add more than " + stock + " items. Already in cart: " + item.getQuantity());
            }
            item.setQuantity(newQty);
        } else {
            if (qtyToAdd > stock) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Requested quantity exceeds available stock (" + stock + ")");
            }
            CartItem newItem = new CartItem();
            newItem.setProductId(request.getProductId());
            newItem.setQuantity(qtyToAdd);
            newItem.setSelectedSize(request.getSelectedSize());
            newItem.setSelectedWeight(request.getSelectedWeight());
            newItem.setSelectedLength(request.getSelectedLength());
            newItem.setSelectedVolume(request.getSelectedVolume());
            newItem.setSelectedQuantityOption(request.getSelectedQuantityOption());
            items.add(newItem);
        }

        Cart saved = cartRepository.save(cart);
        return mapToResponse(saved);
    }

    public CartResponse updateCartItem(CartItemRequest request, String authHeader) {
        AuthUserResponse user = validateCartUser(authHeader);
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Cart not found"));

        if (request.getProductId() == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Product ID is required");
        }

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Product not found"));

        int newQty = request.getQuantity() != null ? request.getQuantity() : 1;
        if (newQty <= 0) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
        }

        int stock = product.getStock() != null ? product.getStock() : 0;
        if (newQty > stock) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Quantity exceeds available stock (" + stock + ")");
        }

        List<CartItem> items = cart.getItems();
        if (items != null) {
            Optional<CartItem> existing = items.stream().filter(item -> 
                    item.getProductId().equals(request.getProductId()) &&
                    nullSafeEquals(item.getSelectedSize(), request.getSelectedSize()) &&
                    nullSafeEquals(item.getSelectedWeight(), request.getSelectedWeight()) &&
                    nullSafeEquals(item.getSelectedLength(), request.getSelectedLength()) &&
                    nullSafeEquals(item.getSelectedVolume(), request.getSelectedVolume()) &&
                    nullSafeEquals(item.getSelectedQuantityOption(), request.getSelectedQuantityOption())
            ).findFirst();

            if (existing.isPresent()) {
                CartItem item = existing.get();
                item.setQuantity(newQty);
                cartRepository.save(cart);
            } else {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Cart item not found");
            }
        }

        return mapToResponse(cart);
    }

    public CartResponse removeCartItem(CartItemRequest request, String authHeader) {
        AuthUserResponse user = validateCartUser(authHeader);
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Cart not found"));

        List<CartItem> items = cart.getItems();
        if (items != null) {
            items.removeIf(item -> 
                    item.getProductId().equals(request.getProductId()) &&
                    nullSafeEquals(item.getSelectedSize(), request.getSelectedSize()) &&
                    nullSafeEquals(item.getSelectedWeight(), request.getSelectedWeight()) &&
                    nullSafeEquals(item.getSelectedLength(), request.getSelectedLength()) &&
                    nullSafeEquals(item.getSelectedVolume(), request.getSelectedVolume()) &&
                    nullSafeEquals(item.getSelectedQuantityOption(), request.getSelectedQuantityOption())
            );
            cartRepository.save(cart);
        }

        return mapToResponse(cart);
    }

    public CartResponse clearCart(String authHeader) {
        AuthUserResponse user = validateCartUser(authHeader);
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Cart not found"));

        if (cart.getItems() != null) {
            cart.getItems().clear();
            cartRepository.save(cart);
        }
        return mapToResponse(cart);
    }

    public CartResponse mergeCart(List<CartItemRequest> requests, String authHeader) {
        AuthUserResponse user = validateCartUser(authHeader);
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Cart c = new Cart();
                    c.setUserId(user.getId());
                    c.setId(String.valueOf(user.getId()));
                    return cartRepository.save(c);
                });

        List<CartItem> items = cart.getItems();
        if (items == null) {
            items = new ArrayList<>();
            cart.setItems(items);
        }

        for (CartItemRequest request : requests) {
            if (request.getProductId() == null || request.getQuantity() == null || request.getQuantity() <= 0) {
                continue; // skip invalid requests
            }

            Product product = productRepository.findById(request.getProductId()).orElse(null);
            if (product == null) {
                continue; // skip if product does not exist
            }

            int stock = product.getStock() != null ? product.getStock() : 0;
            if (stock <= 0) {
                continue; // skip if out of stock
            }

            try {
                validateProductOptions(product, request);
            } catch (Exception e) {
                continue; // skip if options are invalid
            }

            final String prodId = request.getProductId();
            Optional<CartItem> existing = items.stream().filter(item -> 
                    item.getProductId().equals(prodId) &&
                    nullSafeEquals(item.getSelectedSize(), request.getSelectedSize()) &&
                    nullSafeEquals(item.getSelectedWeight(), request.getSelectedWeight()) &&
                    nullSafeEquals(item.getSelectedLength(), request.getSelectedLength()) &&
                    nullSafeEquals(item.getSelectedVolume(), request.getSelectedVolume()) &&
                    nullSafeEquals(item.getSelectedQuantityOption(), request.getSelectedQuantityOption())
            ).findFirst();

            if (existing.isPresent()) {
                CartItem item = existing.get();
                int mergedQty = Math.min(item.getQuantity() + request.getQuantity(), stock);
                item.setQuantity(mergedQty);
            } else {
                CartItem newItem = new CartItem();
                newItem.setProductId(request.getProductId());
                int mergedQty = Math.min(request.getQuantity(), stock);
                newItem.setQuantity(mergedQty);
                newItem.setSelectedSize(request.getSelectedSize());
                newItem.setSelectedWeight(request.getSelectedWeight());
                newItem.setSelectedLength(request.getSelectedLength());
                newItem.setSelectedVolume(request.getSelectedVolume());
                newItem.setSelectedQuantityOption(request.getSelectedQuantityOption());
                items.add(newItem);
            }
        }

        Cart saved = cartRepository.save(cart);
        return mapToResponse(saved);
    }

    private boolean nullSafeEquals(String s1, String s2) {
        if (s1 == null && s2 == null) return true;
        if (s1 == null || s2 == null) return false;
        return s1.trim().equalsIgnoreCase(s2.trim());
    }

    private CartResponse mapToResponse(Cart cart) {
        CartResponse response = new CartResponse();
        response.setId(cart.getId());
        response.setUserId(cart.getUserId());
        List<CartItemResponse> list = new ArrayList<>();

        int totalItemsCount = 0;
        double totalPriceValue = 0.0;

        if (cart.getItems() != null) {
            for (CartItem item : cart.getItems()) {
                Product product = productRepository.findById(item.getProductId()).orElse(null);
                if (product != null) {
                    CartItemResponse itemResp = new CartItemResponse();
                    ProductResponse prodResp = mapProductToResponse(product);
                    itemResp.setProduct(prodResp);
                    itemResp.setQuantity(item.getQuantity());
                    itemResp.setSelectedSize(item.getSelectedSize());
                    itemResp.setSelectedWeight(item.getSelectedWeight());
                    itemResp.setSelectedLength(item.getSelectedLength());
                    itemResp.setSelectedVolume(item.getSelectedVolume());
                    itemResp.setSelectedQuantityOption(item.getSelectedQuantityOption());

                    double price = prodResp.getPrice() != null ? prodResp.getPrice() : 0.0;
                    double subtotal = price * item.getQuantity();
                    itemResp.setSubtotal(subtotal);

                    list.add(itemResp);

                    totalItemsCount += item.getQuantity();
                    totalPriceValue += subtotal;
                }
            }
        }
        response.setItems(list);
        response.setTotalItems(totalItemsCount);
        response.setTotalPrice(totalPriceValue);
        return response;
    }

    private ProductResponse mapProductToResponse(Product product) {
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
        response.setAverageRating(product.getAverageRating());
        response.setNumReviews(product.getNumReviews());
        response.setOffer(product.getOffer());
        response.setCreatedAt(product.getCreatedAt());

        ProductResponse.SellerInfo sellerInfo = new ProductResponse.SellerInfo();
        sellerInfo.setSellerId(product.getSellerId());
        sellerInfo.setName(product.getSellerName());
        sellerInfo.setShopName(product.getSellerShopName());
        sellerInfo.setApproved(product.isSellerApproved());
        response.setSeller(sellerInfo);

        List<String> images = new ArrayList<>();
        List<String> videos = new ArrayList<>();
        if (product.getMedia() != null) {
            for (ProductMedia pm : product.getMedia()) {
                String type = pm.getType() != null ? pm.getType().toLowerCase() : "";
                if (type.startsWith("video")) {
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
}
