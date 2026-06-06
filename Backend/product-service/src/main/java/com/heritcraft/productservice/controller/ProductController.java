package com.heritcraft.productservice.controller;

import com.heritcraft.productservice.dto.ProductRequest;
import com.heritcraft.productservice.dto.ProductResponse;
import com.heritcraft.productservice.dto.SellerProfileSyncRequest;
import com.heritcraft.productservice.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    public ResponseEntity<ProductResponse> addProduct(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ProductRequest request
    ) {
        return new ResponseEntity<>(
                productService.addProduct(request, authHeader),
                HttpStatus.CREATED
        );
    }

    /**
     * GET /api/products — Public: returns only approved products
     */
    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    /**
     * GET /api/products/admin/all — Admin: returns all products including unapproved
     */
    @GetMapping("/admin/all")
    public ResponseEntity<List<ProductResponse>> getAllProductsAdmin(
            @RequestHeader("Authorization") String authHeader
    ) {
        return ResponseEntity.ok(productService.getAllProductsAdmin(authHeader));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable String id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> editProduct(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id,
            @Valid @RequestBody ProductRequest request
    ) {
        return ResponseEntity.ok(productService.editProduct(id, request, authHeader));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id
    ) {
        productService.deleteProduct(id, authHeader);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/products/category/{category} — Public: approved only
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<ProductResponse>> getProductsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(productService.getProductsByCategory(category));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(productService.getCategories());
    }

    /**
     * GET /api/products/seller/{sellerId} — Seller: returns all own products (incl. unapproved)
     */
    @GetMapping("/seller/{sellerId}")
    public ResponseEntity<List<ProductResponse>> getProductsBySeller(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId
    ) {
        return ResponseEntity.ok(productService.getProductsBySeller(sellerId, authHeader));
    }

    /**
     * GET /api/products/featured — Public: returns featured + approved products
     */
    @GetMapping("/featured")
    public ResponseEntity<List<ProductResponse>> getFeaturedProducts() {
        return ResponseEntity.ok(productService.getFeaturedProducts());
    }

    /**
     * GET /api/products/search?q=query — Public: search approved products by name
     */
    @GetMapping("/search")
    public ResponseEntity<List<ProductResponse>> searchProducts(@RequestParam(name = "q", required = false) String query) {
        return ResponseEntity.ok(productService.searchProducts(query));
    }

    /**
     * PUT /api/products/seller/{sellerId}/sync-profile — Sync seller profile to all products
     */
    @PutMapping("/seller/{sellerId}/sync-profile")
    public ResponseEntity<Map<String, Object>> syncSellerProfile(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId,
            @RequestBody SellerProfileSyncRequest request
    ) {
        return ResponseEntity.ok(productService.syncSellerProfile(sellerId, request, authHeader));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ProductResponse> approveProduct(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id
    ) {
        return ResponseEntity.ok(productService.approveProduct(id, authHeader));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ProductResponse> rejectProduct(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id
    ) {
        return ResponseEntity.ok(productService.rejectProduct(id, authHeader));
    }

    @PutMapping("/seller/{sellerId}/approval")
    public ResponseEntity<Void> updateSellerApproval(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId,
            @RequestParam boolean approved
    ) {
        productService.updateSellerApproval(sellerId, approved, authHeader);
        return ResponseEntity.ok().build();
    }
}