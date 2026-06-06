package com.heritcraft.userservice.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Autowired
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("HeritCraft - Password Reset OTP");
        message.setText("Dear User,\n\n" +
                "You have requested to reset your password. Your One Time Password (OTP) is:\n\n" +
                otp + "\n\n" +
                "This OTP is valid for 10 minutes and can be used only once.\n\n" +
                "If you did not request this, please ignore this email.\n\n" +
                "Best regards,\n" +
                "HeritCraft Team");
        try {
            mailSender.send(message);
            System.out.println("OTP email sent successfully to: " + toEmail);
        } catch (Exception e) {
            System.err.println("WARNING: Failed to send email to " + toEmail + ". Error: " + e.getMessage());
            System.err.println("----------------------------------------");
            System.err.println("DEVELOPER TESTING OTP FOR " + toEmail + ": " + otp);
            System.err.println("----------------------------------------");
        }
    }
}
