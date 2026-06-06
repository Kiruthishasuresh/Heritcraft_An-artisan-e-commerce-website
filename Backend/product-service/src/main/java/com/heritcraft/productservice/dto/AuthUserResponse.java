package com.heritcraft.productservice.dto;

import lombok.Data;

@Data
public class AuthUserResponse {
    private Long id;
    private String name;
    private String email;
    private String role;
    private String shopName;
    private String shopDescription;
    private boolean approved;
    private boolean active;
    private String profileImage;
}