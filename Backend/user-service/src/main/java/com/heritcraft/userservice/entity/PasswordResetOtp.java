package com.heritcraft.userservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_otps")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SequenceGenerator(
        name = "otp_seq_generator",
        sequenceName = "otp_seq",
        allocationSize = 1
)
public class PasswordResetOtp {

    @Id
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "otp_seq_generator"
    )
    private Long id;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 6)
    private String otp;

    @Column(name = "expiry_time", nullable = false)
    private LocalDateTime expiryTime;

    @Column(nullable = false)
    private boolean used;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        used = false;
    }
}
