package com.heritcraft.userservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SequenceGenerator(
        name = "user_seq_generator",
        sequenceName = "user_seq",
        allocationSize = 1
)
public class User {

    @Id
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "user_seq_generator"
    )
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(length = 100)
    private String shopName;

    @Column(length = 500)
    private String shopDescription;

    @Column(length = 15)
    private String phone;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 10)
    private String zip;

    @Column(name = "profile_image", length = 1000)
    private String profileImage;

    private Boolean approved = false;

    private Boolean active = false;

    @Column(name = "phone_verified")
    private Boolean phoneVerified = false;

    @Column(name = "phone_verified_at")
    private LocalDateTime phoneVerifiedAt;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (role != null && (role.equalsIgnoreCase("buyer") || role.equalsIgnoreCase("admin"))) {
            approved = true;
        }
        if (phoneVerified == null) {
            phoneVerified = false;
        }
        if (active == null) {
            active = false;
        }
        if (approved == null) {
            approved = false;
        }
    }
}