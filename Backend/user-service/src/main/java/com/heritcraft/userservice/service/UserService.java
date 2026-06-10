package com.heritcraft.userservice.service;

import com.heritcraft.userservice.dto.LoginRequest;
import com.heritcraft.userservice.dto.ProfileUpdateRequest;
import com.heritcraft.userservice.dto.RegisterRequest;
import com.heritcraft.userservice.dto.UserResponse;
import com.heritcraft.userservice.dto.ChangePasswordRequest;
import com.heritcraft.userservice.entity.User;
import com.heritcraft.userservice.repository.UserRepository;
import com.heritcraft.userservice.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordCryptoService cryptoService;
    private final OtpService otpService;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            PasswordCryptoService cryptoService,
            OtpService otpService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.cryptoService = cryptoService;
        this.otpService = otpService;
    }

    /**
     * Register a new user with BCrypt-hashed password.
     * Returns UserResponse without token (since we require OTP verification first).
     */
    public UserResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }
        if (userRepository.phoneExists(request.getPhone())) {
            throw new RuntimeException("Phone number already exists");
        }

        // Enforce OTP verification before registration
        if (!otpService.isPhoneVerified(request.getPhone())) {
            throw new RuntimeException("Mobile number verification is required before signing up.");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());

        // Decrypt RSA password from frontend
        String decryptedPassword = cryptoService.decrypt(request.getPassword());
        if (decryptedPassword == null) {
            throw new RuntimeException("Invalid registration request. Please try again.");
        }

        // Hash password with BCrypt — never store plain text
        user.setPassword(passwordEncoder.encode(decryptedPassword));

        String role = request.getRole().toLowerCase();
        user.setRole(role);
        user.setPhone(request.getPhone());
        user.setPhoneVerified(true);
        user.setPhoneVerifiedAt(LocalDateTime.now());

        user.setActive(true);

        if ("seller".equals(role)) {
            if (request.getAddress() == null || request.getAddress().trim().isEmpty()) {
                throw new RuntimeException("Seller address is required");
            }
            user.setShopName(request.getShopName());
            user.setShopDescription(request.getShopDescription());
            user.setAddress(request.getAddress());
            user.setApproved(false);
        } else {
            user.setApproved(true);
        }

        User savedUser = userRepository.save(user);

        // Mark OTP as used
        otpService.markPhoneOtpAsUsed(savedUser.getPhone());

        return mapToResponse(savedUser, null);
    }

    /**
     * Login with BCrypt password verification.
     */
    public UserResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        // Decrypt RSA password from frontend
        String decryptedPassword = cryptoService.decrypt(request.getPassword());
        if (decryptedPassword == null) {
            throw new RuntimeException("Invalid login request. Please try again.");
        }

        // Verify password using BCrypt matches — never compare plain text
        if (!passwordEncoder.matches(decryptedPassword, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        // Handle unverified mobile
        if (!Boolean.TRUE.equals(user.getPhoneVerified())) {
            otpService.generateAndSendSignupOtp(user.getPhone());
            UserResponse resp = mapToResponse(user, null);
            resp.setPhone(user.getPhone());
            resp.setPhoneVerificationRequired(true);
            return resp;
        }

        // Handle pending seller approval
        if ("seller".equalsIgnoreCase(user.getRole()) && !Boolean.TRUE.equals(user.getApproved())) {
            throw new RuntimeException("Seller account is pending admin approval.");
        }

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new RuntimeException("User account is disabled. Contact administrator.");
        }

        // Generate JWT token
        String token = jwtUtil.generateToken(user);

        return mapToResponse(user, token);
    }

    public void sendPhoneOtp(String phone) {
        if (phone == null || !phone.matches("\\d{10}")) {
            throw new RuntimeException("Mobile number must be exactly 10 digits");
        }

        java.util.Optional<User> existingUser = userRepository.findByPhone(phone);
        if (existingUser.isPresent() && Boolean.TRUE.equals(existingUser.get().getPhoneVerified())) {
            throw new RuntimeException("Phone number already exists and is verified");
        }

        otpService.generateAndSendSignupOtp(phone);
    }

    public boolean verifyPhoneOtp(String phone, String otp) {
        boolean isValid = otpService.verifySignupOtp(phone, otp);
        if (isValid) {
            java.util.Optional<User> existingUser = userRepository.findByPhone(phone);
            if (existingUser.isPresent()) {
                User user = existingUser.get();
                user.setPhoneVerified(true);
                user.setPhoneVerifiedAt(LocalDateTime.now());
                if ("seller".equalsIgnoreCase(user.getRole())) {
                    user.setActive(Boolean.TRUE.equals(user.getApproved()));
                } else {
                    user.setActive(true);
                }
                userRepository.save(user);
                otpService.markPhoneOtpAsUsed(phone);
            }
            return true;
        }
        return false;
    }

    /**
     * Get user by ID — for /api/auth/me endpoint.
     * Returns UserResponse WITHOUT token.
     */
    public UserResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToResponse(user, null);
    }

    /**
     * Update user profile — editable fields only, never password.
     */
    public UserResponse updateProfile(Long id, ProfileUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress());
        }
        if (request.getCity() != null) {
            user.setCity(request.getCity());
        }
        if (request.getState() != null) {
            user.setState(request.getState());
        }
        if (request.getZip() != null) {
            user.setZip(request.getZip());
        }
        if (request.getProfileImage() != null) {
            user.setProfileImage(request.getProfileImage());
        }

        // Seller-specific fields
        if ("seller".equalsIgnoreCase(user.getRole())) {
            if (request.getShopName() != null) {
                user.setShopName(request.getShopName());
            }
            if (request.getShopDescription() != null) {
                user.setShopDescription(request.getShopDescription());
            }
        }

        // Email update with uniqueness check
        if (request.getEmail() != null && !request.getEmail().isBlank() && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new RuntimeException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        User updated = userRepository.save(user);
        return mapToResponse(updated, null);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> mapToResponse(u, null))
                .collect(Collectors.toList());
    }

    public List<UserResponse> getSellers() {
        return userRepository.findByRole("seller").stream()
                .map(u -> mapToResponse(u, null))
                .collect(Collectors.toList());
    }

    /**
     * Get sellers pending approval.
     */
    public List<UserResponse> getPendingSellers() {
        return userRepository.findByRole("seller").stream()
                .filter(u -> !Boolean.TRUE.equals(u.getApproved()))
                .map(u -> mapToResponse(u, null))
                .collect(Collectors.toList());
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToResponse(user, null);
    }

    public UserResponse approveSeller(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"seller".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("User is not a seller");
        }

        user.setApproved(true);
        user.setActive(true);
        User updated = userRepository.save(user);
        return mapToResponse(updated, null);
    }

    /**
     * Reject a seller — marks as not approved and not active.
     */
    public UserResponse rejectSeller(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"seller".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("User is not a seller");
        }

        user.setApproved(false);
        user.setActive(false);
        User updated = userRepository.save(user);
        return mapToResponse(updated, null);
    }

    public UserResponse disableUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(false);
        User updated = userRepository.save(user);
        return mapToResponse(updated, null);
    }

    public UserResponse enableUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(true);
        User updated = userRepository.save(user);
        return mapToResponse(updated, null);
    }

    public boolean existsByEmail(String email) {
        return userRepository.findByEmail(email).isPresent();
    }

    public void updatePassword(String email, String newPasswordEncrypted) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        String decryptedPassword = cryptoService.decrypt(newPasswordEncrypted);
        if (decryptedPassword == null) {
            throw new RuntimeException("Invalid reset request. Please try again.");
        }
        
        user.setPassword(passwordEncoder.encode(decryptedPassword));
        userRepository.save(user);
    }

    public void changePassword(Long id, ChangePasswordRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate required fields
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new RuntimeException("Current password is required");
        }
        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new RuntimeException("New password is required");
        }
        if (request.getConfirmPassword() == null || request.getConfirmPassword().isBlank()) {
            throw new RuntimeException("Confirm password is required");
        }

        // Verify current password using BCrypt
        String decCurrent = cryptoService.decrypt(request.getCurrentPassword());
        String decNew = cryptoService.decrypt(request.getNewPassword());
        String decConfirm = cryptoService.decrypt(request.getConfirmPassword());

        if (decCurrent == null || decNew == null || decConfirm == null) {
            throw new RuntimeException("Invalid password change request. Please try again.");
        }

        if (!passwordEncoder.matches(decCurrent, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        // New password minimum 6 characters
        if (decNew.length() < 6) {
            throw new RuntimeException("New password must be at least 6 characters");
        }

        // New password and confirm password must match
        if (!decNew.equals(decConfirm)) {
            throw new RuntimeException("New password and confirm password do not match");
        }

        // New password must not be the same as current password
        if (passwordEncoder.matches(decNew, user.getPassword())) {
            throw new RuntimeException("New password must be different from current password");
        }

        // Save new BCrypt-hashed password
        user.setPassword(passwordEncoder.encode(decNew));
        userRepository.save(user);
    }

    public List<Long> getApprovedSellerIds() {
        return userRepository.findByRole("seller").stream()
                .filter(u -> Boolean.TRUE.equals(u.getApproved()))
                .map(User::getId)
                .collect(Collectors.toList());
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        userRepository.delete(user);
    }

    /**
     * Map User entity to UserResponse DTO.
     * Password is NEVER included in the response.
     */
    private UserResponse mapToResponse(User user, String token) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setShopName(user.getShopName());
        response.setShopDescription(user.getShopDescription());
        response.setPhone(user.getPhone());
        response.setAddress(user.getAddress());
        response.setCity(user.getCity());
        response.setState(user.getState());
        response.setZip(user.getZip());
        response.setProfileImage(user.getProfileImage());
        response.setApproved(Boolean.TRUE.equals(user.getApproved()));
        response.setActive(Boolean.TRUE.equals(user.getActive()));
        response.setPhoneVerified(Boolean.TRUE.equals(user.getPhoneVerified()));
        response.setPhoneVerifiedAt(user.getPhoneVerifiedAt());
        response.setCreatedAt(user.getCreatedAt());
        response.setToken(token); // null unless login/register
        return response;
    }
}