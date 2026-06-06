package com.heritcraft.userservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String role;
    private String shopName;
    private String shopDescription;
    private String phone;
    private String address;
    private String city;
    private String state;
    private String zip;
    private String profileImage;
    private boolean approved;
    private boolean active;
    private LocalDateTime createdAt;

    /**
     * JWT token — only populated on login/register responses.
     * Null otherwise (excluded from JSON by @JsonInclude).
     */
    private String token;

    /**
     * Flag for seller registration — indicates pending admin approval.
     * Null otherwise (excluded from JSON by @JsonInclude).
     */
    private Boolean pendingApproval;
}