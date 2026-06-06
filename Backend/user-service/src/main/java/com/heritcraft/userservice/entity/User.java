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

    private boolean approved;

    private boolean active;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();

        if (!active) {
            active = true;
        }

        if (role != null && role.equalsIgnoreCase("buyer")) {
            approved = true;
        }
    }
}