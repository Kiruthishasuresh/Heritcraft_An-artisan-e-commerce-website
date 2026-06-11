package com.heritcraft.userservice.repository;

import com.heritcraft.userservice.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    Optional<EmailVerification> findByEmailAndOtpAndUsedFalse(String email, String otp);
    List<EmailVerification> findByEmailAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(String email);
}
