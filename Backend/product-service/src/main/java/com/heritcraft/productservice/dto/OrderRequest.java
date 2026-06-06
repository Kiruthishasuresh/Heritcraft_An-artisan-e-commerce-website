package com.heritcraft.productservice.dto;

import com.heritcraft.productservice.entity.OrderItem;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest {

    @NotNull(message = "userId is required")
    private Long userId;

    private String userName;
    private String userEmail;

    @NotNull(message = "Order items are required")
    private List<OrderItem> items;

    private Double subtotal;
    private Double shipping;
    private Double tax;
    private Double totalAmount;

    @NotBlank(message = "Payment method is required")
    private String paymentMethod;

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Phone is required")
    private String phone;

    @NotBlank(message = "Zip is required")
    private String zip;

    @NotBlank(message = "Address is required")
    private String address;

    @NotBlank(message = "City is required")
    private String city;

    @NotBlank(message = "State is required")
    private String state;
}