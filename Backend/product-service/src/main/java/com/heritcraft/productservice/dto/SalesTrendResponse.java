package com.heritcraft.productservice.dto;

public class SalesTrendResponse {
    private String period;
    private Double totalSales;
    private Integer totalOrders;
    private Integer totalProductsSold;

    public SalesTrendResponse(String period, Double totalSales, Integer totalOrders, Integer totalProductsSold) {
        this.period = period;
        this.totalSales = totalSales;
        this.totalOrders = totalOrders;
        this.totalProductsSold = totalProductsSold;
    }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public Double getTotalSales() { return totalSales; }
    public void setTotalSales(Double totalSales) { this.totalSales = totalSales; }
    public Integer getTotalOrders() { return totalOrders; }
    public void setTotalOrders(Integer totalOrders) { this.totalOrders = totalOrders; }
    public Integer getTotalProductsSold() { return totalProductsSold; }
    public void setTotalProductsSold(Integer totalProductsSold) { this.totalProductsSold = totalProductsSold; }
}
