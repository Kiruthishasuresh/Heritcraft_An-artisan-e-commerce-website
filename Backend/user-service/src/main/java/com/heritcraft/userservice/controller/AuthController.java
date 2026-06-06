package com.heritcraft.userservice.controller;

import com.heritcraft.userservice.dto.LoginRequest;
import com.heritcraft.userservice.dto.RegisterRequest;
import com.heritcraft.userservice.dto.UserResponse;
import com.heritcraft.userservice.dto.ForgotPasswordRequest;
import com.heritcraft.userservice.dto.VerifyOtpRequest;
import com.heritcraft.userservice.dto.ResetPasswordRequest;
import com.heritcraft.userservice.security.JwtUtil;
import com.heritcraft.userservice.service.UserService;
import com.heritcraft.userservice.service.OtpService;
import com.heritcraft.userservice.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Auth controller — handles authentication endpoints.
 * Maps to /api/auth/* to match frontend API calls.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final EmailService emailService;

    @org.springframework.beans.factory.annotation.Value("${rsa.public.key}")
    private String publicKey;

    @Autowired
    public AuthController(UserService userService, JwtUtil jwtUtil, OtpService otpService, EmailService emailService) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.otpService = otpService;
        this.emailService = emailService;
    }

    /**
     * GET /api/auth/public-key
     * Returns the RSA public key for frontend password encryption.
     */
    @GetMapping("/public-key")
    public ResponseEntity<Map<String, String>> getPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", publicKey));
    }

    /**
     * POST /api/auth/register
     * Register a new user. Password is encrypted with RSA from frontend, decrypted here, and hashed with BCrypt.
     * Returns user details + JWT token.
     */
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = userService.register(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * POST /api/auth/login
     * Authenticate user with BCrypt password verification.
     * Returns user details + JWT token.
     */
    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request) {
        UserResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/auth/me
     * Returns current logged-in user details based on JWT token.
     * Token is validated by JwtAuthFilter → SecurityContext is populated.
     * Password is never returned.
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Principal is the userId (set by JwtAuthFilter)
        Long userId = Long.parseLong(authentication.getPrincipal().toString());
        UserResponse response = userService.getUserProfile(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/auth/forgot-password
     * Generates OTP and sends email if the email is registered.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail();
        try {
            boolean userExists = userService.existsByEmail(email);
            if (userExists) {
                String otp = otpService.generateOtp(email);
                emailService.sendOtpEmail(email, otp);
            } else {
                Thread.sleep(100); // Prevent side-channel timing attacks
            }
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("Please wait")) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("message", e.getMessage()));
            }
        }
        return ResponseEntity.ok(Map.of("message", "If the email is registered, a password reset OTP has been sent."));
    }

    /**
     * POST /api/auth/verify-otp
     * Verifies that the OTP is correct and not expired.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        boolean isValid = otpService.verifyOtpOnly(request.getEmail(), request.getOtp());
        if (isValid) {
            return ResponseEntity.ok(Map.of("message", "OTP verified successfully."));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid or expired OTP."));
        }
    }

    /**
     * POST /api/auth/reset-password
     * Resets user password and marks OTP as used.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        boolean isValid = otpService.verifyOtpOnly(request.getEmail(), request.getOtp());
        if (!isValid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid or expired OTP."));
        }
        try {
            userService.updatePassword(request.getEmail(), request.getNewPassword());
            otpService.markOtpAsUsed(request.getEmail(), request.getOtp());
            return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to update password."));
        }
    }
}