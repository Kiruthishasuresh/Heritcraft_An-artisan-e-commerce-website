package com.heritcraft.productservice.controller;

import com.heritcraft.productservice.dto.AuthUserResponse;
import com.heritcraft.productservice.dto.ReportSummaryResponse;
import com.heritcraft.productservice.dto.SalesTrendResponse;
import com.heritcraft.productservice.service.ReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;
    private final RestTemplate restTemplate = new RestTemplate();
    private static final String USER_SERVICE_ME_URL = "http://127.0.0.1:8081/api/auth/me";

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/seller/{sellerId}/summary")
    public ResponseEntity<ReportSummaryResponse> getSellerSummary(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId,
            @RequestParam(defaultValue = "daily") String range,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getId().equals(sellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Cannot fetch report for another seller.");
        }
        return ResponseEntity.ok(reportService.getSellerSummary(sellerId, range, startDate, endDate, user));
    }

    @GetMapping("/seller/{sellerId}/sales-trend")
    public ResponseEntity<List<SalesTrendResponse>> getSellerSalesTrend(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId,
            @RequestParam(defaultValue = "daily") String range,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getId().equals(sellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Cannot fetch report for another seller.");
        }
        return ResponseEntity.ok(reportService.getSellerSalesTrend(sellerId, range, startDate, endDate));
    }

    @GetMapping("/seller/{sellerId}/export")
    public ResponseEntity<byte[]> exportSellerReport(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long sellerId,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(defaultValue = "daily") String range,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getId().equals(sellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Cannot fetch report for another seller.");
        }

        try {
            byte[] data;
            String contentType;
            String extension;

            if ("pdf".equalsIgnoreCase(format)) {
                data = reportService.generateSellerPdf(sellerId, range, startDate, endDate, user);
                contentType = "application/pdf";
                extension = "pdf";
            } else {
                data = reportService.generateSellerCsv(sellerId, range, startDate, endDate, user);
                contentType = "text/csv";
                extension = "csv";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentDispositionFormData("attachment", "seller_report_" + sellerId + "_" + range + "." + extension);
            return new ResponseEntity<>(data, headers, HttpStatus.OK);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error generating report: " + e.getMessage());
        }
    }

    @GetMapping("/admin/summary")
    public ResponseEntity<ReportSummaryResponse> getAdminSummary(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "daily") String range,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Admin role required.");
        }
        return ResponseEntity.ok(reportService.getAdminSummary(range, startDate, endDate, user));
    }

    @GetMapping("/admin/sales-trend")
    public ResponseEntity<List<SalesTrendResponse>> getAdminSalesTrend(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "daily") String range,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Admin role required.");
        }
        return ResponseEntity.ok(reportService.getAdminSalesTrend(range, startDate, endDate));
    }

    @GetMapping("/admin/export")
    public ResponseEntity<byte[]> exportAdminReport(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(defaultValue = "daily") String range,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        AuthUserResponse user = getLoggedInUser(authHeader);
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Admin role required.");
        }

        try {
            byte[] data;
            String contentType;
            String extension;

            if ("pdf".equalsIgnoreCase(format)) {
                data = reportService.generateAdminPdf(range, startDate, endDate, user);
                contentType = "application/pdf";
                extension = "pdf";
            } else {
                data = reportService.generateAdminCsv(range, startDate, endDate, user);
                contentType = "text/csv";
                extension = "csv";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentDispositionFormData("attachment", "admin_report_" + range + "." + extension);
            return new ResponseEntity<>(data, headers, HttpStatus.OK);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error generating report: " + e.getMessage());
        }
    }

    private AuthUserResponse getLoggedInUser(String authHeader) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", authHeader);
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            ResponseEntity<AuthUserResponse> response = restTemplate.exchange(
                    USER_SERVICE_ME_URL,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    AuthUserResponse.class
            );
            AuthUserResponse user = response.getBody();
            if (user == null) {
                throw new RuntimeException("Invalid user");
            }
            return user;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized. Please login again.");
        }
    }
}
