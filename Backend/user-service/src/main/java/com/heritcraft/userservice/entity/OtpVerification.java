package com.heritcraft.userservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "otp_verifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SequenceGenerator(
        name = "otp_ver_seq_generator",
        sequenceName = "otp_ver_seq",
        allocationSize = 1
)
public class OtpVerification {

    @Id
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "otp_ver_seq_generator"
    )
    private Long id;

    @Column(nullable = false, length = 15)
    private String phone;

    @Column(nullable = false, length = 6)
    private String otp;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiryTime;

    @Column(nullable = false)
    private Integer attempts = 0;

    private Boolean verified = false;
    private Boolean used = false;
    
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (attempts == null) {
            attempts = 0;
        }
        if (verified == null) {
            verified = false;
        }
        if (used == null) {
            used = false;
        }
    }
}
