package com.heritcraft.productservice.dto;

import java.util.Map;
import java.util.List;

public class ReportSummaryResponse {
    private String brandName;
    private String reportTitle;
    private String reportType;
    private String generatedAt;
    private Map<String, String> dateRange;
    
    // For Seller Report
    private Map<String, Object> seller;
    
    // For Admin Report
    private Map<String, Object> admin;
    private Map<String, Object> platform;
    
    private Map<String, Object> summary;
    private List<Map<String, Object>> topProducts;

    public String getBrandName() { return brandName; }
    public void setBrandName(String brandName) { this.brandName = brandName; }
    public String getReportTitle() { return reportTitle; }
    public void setReportTitle(String reportTitle) { this.reportTitle = reportTitle; }
    public String getReportType() { return reportType; }
    public void setReportType(String reportType) { this.reportType = reportType; }
    public String getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(String generatedAt) { this.generatedAt = generatedAt; }
    public Map<String, String> getDateRange() { return dateRange; }
    public void setDateRange(Map<String, String> dateRange) { this.dateRange = dateRange; }
    public Map<String, Object> getSeller() { return seller; }
    public void setSeller(Map<String, Object> seller) { this.seller = seller; }
    public Map<String, Object> getAdmin() { return admin; }
    public void setAdmin(Map<String, Object> admin) { this.admin = admin; }
    public Map<String, Object> getPlatform() { return platform; }
    public void setPlatform(Map<String, Object> platform) { this.platform = platform; }
    public Map<String, Object> getSummary() { return summary; }
    public void setSummary(Map<String, Object> summary) { this.summary = summary; }
    public List<Map<String, Object>> getTopProducts() { return topProducts; }
    public void setTopProducts(List<Map<String, Object>> topProducts) { this.topProducts = topProducts; }
}
