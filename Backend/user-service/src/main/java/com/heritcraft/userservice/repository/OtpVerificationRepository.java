package com.heritcraft.userservice.repository;

import com.heritcraft.userservice.entity.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findByPhoneAndOtpAndUsedFalse(String phone, String otp);
    java.util.List<OtpVerification> findByPhoneAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(String phone);
}
