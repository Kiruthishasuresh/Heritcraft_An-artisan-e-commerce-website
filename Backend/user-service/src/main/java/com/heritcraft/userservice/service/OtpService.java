package com.heritcraft.userservice.service;

import com.heritcraft.userservice.entity.PasswordResetOtp;
import com.heritcraft.userservice.repository.PasswordResetOtpRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class OtpService {

    private final PasswordResetOtpRepository otpRepository;
    private final Random random = new Random();

    public OtpService(PasswordResetOtpRepository otpRepository) {
        this.otpRepository = otpRepository;
    }

    public String generateOtp(String email) {

        List<PasswordResetOtp> otpList =
                otpRepository.findByEmailOrderByCreatedAtDesc(email);

        if (!otpList.isEmpty()) {
            PasswordResetOtp lastOtp = otpList.get(0);

            LocalDateTime lastCreated = lastOtp.getCreatedAt();

            if (lastCreated != null &&
                    lastCreated.plusMinutes(1).isAfter(LocalDateTime.now())) {
                throw new RuntimeException(
                        "Please wait 1 minute before requesting another OTP."
                );
            }
        }

        String otp = String.format("%06d", random.nextInt(1000000));

        PasswordResetOtp record = new PasswordResetOtp();
        record.setEmail(email);
        record.setOtp(otp);
        record.setExpiryTime(LocalDateTime.now().plusMinutes(10));
        record.setUsed(false);

        otpRepository.save(record);

        return otp;
    }

    public boolean verifyOtpOnly(String email, String otp) {

        Optional<PasswordResetOtp> record =
                otpRepository.findByEmailAndOtpAndUsedFalse(email, otp);

        if (record.isPresent()) {
            PasswordResetOtp otpEntity = record.get();

            return otpEntity.getExpiryTime() != null &&
                    otpEntity.getExpiryTime().isAfter(LocalDateTime.now());
        }

        return false;
    }

    public void markOtpAsUsed(String email, String otp) {

        Optional<PasswordResetOtp> record =
                otpRepository.findByEmailAndOtpAndUsedFalse(email, otp);

        if (record.isPresent()) {
            PasswordResetOtp otpEntity = record.get();
            otpEntity.setUsed(true);
            otpRepository.save(otpEntity);
        }
    }
}