package com.heritcraft.productservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaItemDto {
    private String url;
    private String type;
    private String name;
}
