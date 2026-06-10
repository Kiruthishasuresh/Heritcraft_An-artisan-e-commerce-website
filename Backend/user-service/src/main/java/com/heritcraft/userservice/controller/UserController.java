package com.heritcraft.userservice.controller;

import com.heritcraft.userservice.dto.ProfileUpdateRequest;
import com.heritcraft.userservice.dto.UserResponse;
import com.heritcraft.userservice.dto.ChangePasswordRequest;
import com.heritcraft.userservice.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * User management controller — handles admin operations and profile updates.
 * Auth endpoints (login/register/me) are in AuthController at /api/auth.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    private void verifyAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Admin role required.");
        }
    }

    private void verifyUserOrAdmin(Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        Long loggedInUserId = Long.parseLong(authentication.getPrincipal().toString());
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        if (!loggedInUserId.equals(id) && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You can only access your own profile.");
        }
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        verifyAdmin();
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/sellers")
    public ResponseEntity<List<UserResponse>> getSellers() {
        // Can be called by authenticated users
        return ResponseEntity.ok(userService.getSellers());
    }

    @GetMapping("/approved-sellers")
    public ResponseEntity<List<Long>> getApprovedSellerIds() {
        return ResponseEntity.ok(userService.getApprovedSellerIds());
    }

    @GetMapping("/sellers/pending")
    public ResponseEntity<List<UserResponse>> getPendingSellers() {
        verifyAdmin();
        return ResponseEntity.ok(userService.getPendingSellers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        verifyUserOrAdmin(id);
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<UserResponse> approveSeller(@PathVariable Long id) {
        verifyAdmin();
        return ResponseEntity.ok(userService.approveSeller(id));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<UserResponse> rejectSeller(@PathVariable Long id) {
        verifyAdmin();
        return ResponseEntity.ok(userService.rejectSeller(id));
    }

    @PutMapping("/{id}/disable")
    public ResponseEntity<UserResponse> disableUser(@PathVariable Long id) {
        verifyAdmin();
        return ResponseEntity.ok(userService.disableUser(id));
    }

    @PutMapping("/{id}/enable")
    public ResponseEntity<UserResponse> enableUser(@PathVariable Long id) {
        verifyAdmin();
        return ResponseEntity.ok(userService.enableUser(id));
    }

    /**
     * PUT /api/users/{id}/profile
     * Update user profile fields (name, phone, address, etc.)
     * Password is never exposed or editable via this endpoint.
     */
    @PutMapping("/{id}/profile")
    public ResponseEntity<UserResponse> updateProfile(
            @PathVariable Long id,
            @RequestBody ProfileUpdateRequest request
    ) {
        verifyUserOrAdmin(id);
        return ResponseEntity.ok(userService.updateProfile(id, request));
    }

    @PutMapping("/{id}/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @PathVariable Long id,
            @RequestBody ChangePasswordRequest request
    ) {
        verifyUserOrAdmin(id);
        userService.changePassword(id, request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        verifyAdmin();
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
