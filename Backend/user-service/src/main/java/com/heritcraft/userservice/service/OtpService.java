package com.heritcraft.userservice.service;

import com.heritcraft.userservice.entity.PasswordResetOtp;
import com.heritcraft.userservice.entity.OtpVerification;
import com.heritcraft.userservice.repository.PasswordResetOtpRepository;
import com.heritcraft.userservice.repository.OtpVerificationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class OtpService {

    private final PasswordResetOtpRepository otpRepository;
    private final OtpVerificationRepository otpVerificationRepository;
    private final SmsService smsService;
    private final Random random = new Random();

    public OtpService(
            PasswordResetOtpRepository otpRepository,
            OtpVerificationRepository otpVerificationRepository,
            SmsService smsService
    ) {
        this.otpRepository = otpRepository;
        this.otpVerificationRepository = otpVerificationRepository;
        this.smsService = smsService;
    }

    public void generateAndSendSignupOtp(String phone) {
        String otp = String.format("%06d", random.nextInt(1000000));

        OtpVerification record = new OtpVerification();
        record.setPhone(phone);
        record.setOtp(otp);
        record.setExpiryTime(LocalDateTime.now().plusMinutes(5)); // 5 minutes validation
        record.setAttempts(0);
        record.setVerified(false);
        record.setUsed(false);

        otpVerificationRepository.save(record);

        smsService.sendSms(phone, "Your HeritCraft signup verification OTP is: " + otp);
    }

    public boolean verifySignupOtp(String phone, String otp) {
        Optional<OtpVerification> recordOpt = otpVerificationRepository.findByPhoneAndOtpAndUsedFalse(phone, otp);

        if (recordOpt.isPresent()) {
            OtpVerification record = recordOpt.get();
            if (record.getExpiryTime().isAfter(LocalDateTime.now())) {
                record.setVerified(true);
                otpVerificationRepository.save(record);
                return true;
            }
        }
        return false;
    }

    public boolean isPhoneVerified(String phone) {
        List<OtpVerification> records = otpVerificationRepository.findByPhoneAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(phone);
        if (records.isEmpty()) {
            return false;
        }
        OtpVerification record = records.get(0);
        return record.getExpiryTime().isAfter(LocalDateTime.now());
    }

    public void markPhoneOtpAsUsed(String phone) {
        List<OtpVerification> records = otpVerificationRepository.findByPhoneAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(phone);
        for (OtpVerification record : records) {
            record.setUsed(true);
            otpVerificationRepository.save(record);
        }
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