package com.heritcraft.userservice.repository;

import com.heritcraft.userservice.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findByEmailAndOtpAndUsedFalse(String email, String otp);

    List<PasswordResetOtp> findByEmailOrderByCreatedAtDesc(String email);
}