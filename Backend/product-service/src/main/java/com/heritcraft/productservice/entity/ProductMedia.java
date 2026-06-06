package com.heritcraft.productservice.entity;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductMedia {
    private String url;
    private String type;
    private String name;
}