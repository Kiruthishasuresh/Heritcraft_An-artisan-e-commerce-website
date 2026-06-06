package com.heritcraft.userservice.service;

import com.heritcraft.userservice.dto.LoginRequest;
import com.heritcraft.userservice.dto.ProfileUpdateRequest;
import com.heritcraft.userservice.dto.RegisterRequest;
import com.heritcraft.userservice.dto.UserResponse;
import com.heritcraft.userservice.dto.ChangePasswordRequest;
import com.heritcraft.userservice.entity.User;
import com.heritcraft.userservice.repository.UserRepository;
import com.heritcraft.userservice.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordCryptoService cryptoService;

    @Autowired
    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            PasswordCryptoService cryptoService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.cryptoService = cryptoService;
    }

    /**
     * Register a new user with BCrypt-hashed password.
     * Returns UserResponse with JWT token.
     * Sellers get pendingApproval flag — no token until approved.
     */
    public UserResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
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

        if ("seller".equals(role)) {
            user.setShopName(request.getShopName());
            user.setShopDescription(request.getShopDescription());
            user.setApproved(false);
        } else {
            user.setApproved(true);
        }

        user.setActive(true);

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }

        User savedUser = userRepository.save(user);

        // Sellers pending approval: return response without token
        if ("seller".equals(role) && !savedUser.isApproved()) {
            UserResponse resp = mapToResponse(savedUser, null);
            resp.setPendingApproval(true);
            return resp;
        }

        // Generate JWT token for immediate login after registration
        String token = jwtUtil.generateToken(savedUser);

        return mapToResponse(savedUser, token);
    }

    /**
     * Login with BCrypt password verification.
     * Returns UserResponse with JWT token.
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

        if (!user.isActive()) {
            throw new RuntimeException("User account is disabled. Contact administrator.");
        }

        // Allow seller login even if not approved — they see restricted dashboard
        // but don't generate an error that blocks them entirely

        // Generate JWT token
        String token = jwtUtil.generateToken(user);

        return mapToResponse(user, token);
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
                .filter(u -> !u.isApproved())
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
                .filter(User::isApproved)
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
        response.setApproved(user.isApproved());
        response.setActive(user.isActive());
        response.setCreatedAt(user.getCreatedAt());
        response.setToken(token); // null unless login/register
        return response;
    }
}