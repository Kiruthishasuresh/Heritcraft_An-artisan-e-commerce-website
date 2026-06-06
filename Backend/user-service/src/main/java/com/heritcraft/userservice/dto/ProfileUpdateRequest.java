package com.heritcraft.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileUpdateRequest {
    private String name;
    private String phone;
    private String address;
    private String city;
    private String state;
    private String zip;

    // Seller-specific
    private String shopName;
    private String shopDescription;

    // Admin can update email
    private String email;

    private String profileImage;
}
