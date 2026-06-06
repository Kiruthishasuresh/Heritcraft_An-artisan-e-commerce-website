package com.heritcraft.productservice.service;

import com.heritcraft.productservice.dto.AuthUserResponse;
import com.heritcraft.productservice.dto.ReportSummaryResponse;
import com.heritcraft.productservice.dto.SalesTrendResponse;
import com.heritcraft.productservice.entity.Order;
import com.heritcraft.productservice.entity.OrderItem;
import com.heritcraft.productservice.entity.Product;
import com.heritcraft.productservice.entity.Review;
import com.heritcraft.productservice.repository.OrderRepository;
import com.heritcraft.productservice.repository.ProductRepository;
import com.heritcraft.productservice.repository.ReviewRepository;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPRow;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.BaseFont;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.util.*;
import java.util.stream.Collectors;
import java.awt.Color;

@Service
public class ReportService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DAY_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final DateTimeFormatter YEAR_FORMATTER = DateTimeFormatter.ofPattern("yyyy");

    public ReportService(OrderRepository orderRepository, ProductRepository productRepository, ReviewRepository reviewRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.reviewRepository = reviewRepository;
    }

    private LocalDateTime[] getDateRange(String range, String start, String end) {
        LocalDateTime startDate = null;
        LocalDateTime endDate = LocalDateTime.now();

        if (start != null && !start.isEmpty()) {
            startDate = LocalDate.parse(start).atStartOfDay();
        }
        if (end != null && !end.isEmpty()) {
            endDate = LocalDate.parse(end).atTime(23, 59, 59);
        }

        if (startDate == null) {
            switch (range != null ? range.toLowerCase() : "daily") {
                case "yearly":
                    startDate = endDate.minusYears(5);
                    break;
                case "monthly":
                    startDate = endDate.minusMonths(12);
                    break;
                case "weekly":
                    startDate = endDate.minusWeeks(8);
                    break;
                case "daily":
                default:
                    startDate = endDate.minusDays(7);
                    break;
            }
        }
        return new LocalDateTime[]{startDate, endDate};
    }

    private boolean isValidOrder(Order order, LocalDateTime start, LocalDateTime end) {
        if (order.getOrderStatus() != null && order.getOrderStatus().equalsIgnoreCase("CANCELLED")) {
            return false;
        }
        if (order.getCreatedAt() == null) return false;
        return !order.getCreatedAt().isBefore(start) && !order.getCreatedAt().isAfter(end);
    }

    private String getPeriodKey(LocalDateTime date, String range) {
        if (date == null) return "Unknown";
        switch (range != null ? range.toLowerCase() : "daily") {
            case "yearly": return date.format(YEAR_FORMATTER);
            case "monthly": return date.format(MONTH_FORMATTER);
            case "weekly": return date.getYear() + "-W" + String.format("%02d", date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
            case "daily":
            default: return date.format(DAY_FORMATTER);
        }
    }

    // ================= SELLER REPORTS =================

    public ReportSummaryResponse getSellerSummary(Long sellerId, String range, String start, String end, AuthUserResponse user) {
        LocalDateTime[] dates = getDateRange(range, start, end);
        List<Order> orders = orderRepository.findByItemsSellerIdOrderByCreatedAtDesc(sellerId)
                .stream().filter(o -> isValidOrder(o, dates[0], dates[1])).collect(Collectors.toList());

        double totalSales = 0.0;
        double codRevenue = 0.0;
        double razorpayRevenue = 0.0;
        double pendingCodAmount = 0.0;
        int paidOrders = 0;
        int failedPayments = 0;
        int totalOrders = 0;
        int totalProductsSold = 0;
        Map<String, Integer> productSales = new HashMap<>();

        for (Order order : orders) {
            boolean hasSellerItem = false;
            double orderSellerTotal = 0.0;
            for (OrderItem item : order.getItems()) {
                if (sellerId.equals(item.getSellerId())) {
                    hasSellerItem = true;
                    double price = item.getPrice() != null ? item.getPrice() : 0.0;
                    int qty = item.getQuantity() != null ? item.getQuantity() : 1;
                    orderSellerTotal += price * qty;
                    totalProductsSold += qty;
                    productSales.put(item.getProductName(), productSales.getOrDefault(item.getProductName(), 0) + qty);
                }
            }
            if (hasSellerItem) {
                totalOrders++;
                totalSales += orderSellerTotal;
                
                String payMethod = order.getPaymentMethod();
                String payStatus = order.getPaymentStatus();
                
                boolean isRazorpay = "RAZORPAY".equalsIgnoreCase(payMethod);
                boolean isCOD = "COD".equalsIgnoreCase(payMethod) || "Cash on Delivery".equalsIgnoreCase(payMethod);
                
                if (isRazorpay) {
                    if ("PAID".equalsIgnoreCase(payStatus)) {
                        razorpayRevenue += orderSellerTotal;
                        paidOrders++;
                    } else if ("FAILED".equalsIgnoreCase(payStatus)) {
                        failedPayments++;
                    }
                } else if (isCOD) {
                    if ("COD_PENDING".equalsIgnoreCase(payStatus) || "PENDING".equalsIgnoreCase(payStatus)) {
                        pendingCodAmount += orderSellerTotal;
                    } else if ("PAID".equalsIgnoreCase(payStatus)) {
                        codRevenue += orderSellerTotal;
                        paidOrders++;
                    }
                } else {
                    if ("COD_PENDING".equalsIgnoreCase(payStatus) || "PENDING".equalsIgnoreCase(payStatus)) {
                        pendingCodAmount += orderSellerTotal;
                    } else if ("PAID".equalsIgnoreCase(payStatus)) {
                        codRevenue += orderSellerTotal;
                        paidOrders++;
                    }
                }
            }
        }

        String bestSelling = productSales.entrySet().stream()
                .max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("N/A");

        List<Product> products = productRepository.findBySellerId(sellerId);
        long lowStockCount = products.stream().filter(p -> p.getStock() != null && p.getStock() <= 5).count();
        
        List<Review> reviews = reviewRepository.findBySellerId(sellerId);
        double avgRating = reviews.isEmpty() ? 0.0 : reviews.stream().mapToInt(r -> r.getRating() != null ? r.getRating() : 0).average().orElse(0.0);

        ReportSummaryResponse res = new ReportSummaryResponse();
        res.setBrandName("HeritCraft");
        res.setReportTitle("Seller Sales Report");
        res.setReportType(range != null ? range : "daily");
        res.setGeneratedAt(LocalDateTime.now().format(DATE_FORMATTER));
        
        Map<String, String> dateRange = new HashMap<>();
        dateRange.put("startDate", dates[0].format(DAY_FORMATTER));
        dateRange.put("endDate", dates[1].format(DAY_FORMATTER));
        res.setDateRange(dateRange);

        Map<String, Object> sellerMap = new HashMap<>();
        sellerMap.put("sellerId", sellerId);
        sellerMap.put("sellerName", user.getName());
        sellerMap.put("shopName", user.getShopName() != null ? user.getShopName() : user.getName() + " Shop");
        sellerMap.put("sellerEmail", user.getEmail());
        res.setSeller(sellerMap);

        Map<String, Object> sumMap = new HashMap<>();
        sumMap.put("totalSales", totalSales);
        sumMap.put("totalOrders", totalOrders);
        sumMap.put("totalProductsSold", totalProductsSold);
        sumMap.put("averageOrderValue", totalOrders > 0 ? totalSales / totalOrders : 0);
        sumMap.put("totalReviews", reviews.size());
        sumMap.put("averageRating", avgRating);
        sumMap.put("bestSellingProduct", bestSelling);
        sumMap.put("lowStockProducts", lowStockCount);
        sumMap.put("codRevenue", codRevenue);
        sumMap.put("razorpayRevenue", razorpayRevenue);
        sumMap.put("pendingCodAmount", pendingCodAmount);
        sumMap.put("paidOrders", paidOrders);
        sumMap.put("failedPayments", failedPayments);
        res.setSummary(sumMap);
        
        List<Map<String, Object>> topProds = productSales.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .limit(5)
            .map(e -> {
                Map<String, Object> m = new HashMap<>();
                m.put("name", e.getKey());
                m.put("sold", e.getValue());
                return m;
            }).collect(Collectors.toList());
        res.setTopProducts(topProds);

        return res;
    }

    public List<SalesTrendResponse> getSellerSalesTrend(Long sellerId, String range, String start, String end) {
        LocalDateTime[] dates = getDateRange(range, start, end);
        List<Order> orders = orderRepository.findByItemsSellerIdOrderByCreatedAtDesc(sellerId)
                .stream().filter(o -> isValidOrder(o, dates[0], dates[1])).collect(Collectors.toList());

        Map<String, SalesTrendResponse> trendMap = new TreeMap<>();
        
        for (Order order : orders) {
            String period = getPeriodKey(order.getCreatedAt(), range);
            SalesTrendResponse tr = trendMap.computeIfAbsent(period, p -> new SalesTrendResponse(p, 0.0, 0, 0));
            
            boolean hasItem = false;
            for (OrderItem item : order.getItems()) {
                if (sellerId.equals(item.getSellerId())) {
                    hasItem = true;
                    double price = item.getPrice() != null ? item.getPrice() : 0.0;
                    int qty = item.getQuantity() != null ? item.getQuantity() : 1;
                    tr.setTotalSales(tr.getTotalSales() + (price * qty));
                    tr.setTotalProductsSold(tr.getTotalProductsSold() + qty);
                }
            }
            if (hasItem) {
                tr.setTotalOrders(tr.getTotalOrders() + 1);
            }
        }
        return new ArrayList<>(trendMap.values());
    }

    public byte[] generateSellerCsv(Long sellerId, String range, String start, String end, AuthUserResponse user) {
        ReportSummaryResponse summary = getSellerSummary(sellerId, range, start, end, user);
        List<SalesTrendResponse> trends = getSellerSalesTrend(sellerId, range, start, end);

        StringBuilder sb = new StringBuilder();
        sb.append("Brand,HeritCraft\n");
        sb.append("Report Title,").append(summary.getReportTitle()).append("\n");
        sb.append("Report Type,").append(summary.getReportType()).append("\n");
        sb.append("Generated At,").append(summary.getGeneratedAt()).append("\n");
        sb.append("Start Date,").append(summary.getDateRange().get("startDate")).append("\n");
        sb.append("End Date,").append(summary.getDateRange().get("endDate")).append("\n");
        sb.append("Seller Name,").append(escapeCsv((String) summary.getSeller().get("sellerName"))).append("\n");
        sb.append("Shop Name,").append(escapeCsv((String) summary.getSeller().get("shopName"))).append("\n\n");
        
        sb.append("NOTE: Revenue is calculated from non-cancelled orders.\n");
        sb.append("COD Revenue,").append(summary.getSummary().get("codRevenue")).append("\n");
        sb.append("Razorpay Revenue,").append(summary.getSummary().get("razorpayRevenue")).append("\n");
        sb.append("Pending COD Amount,").append(summary.getSummary().get("pendingCodAmount")).append("\n");
        sb.append("Paid Orders,").append(summary.getSummary().get("paidOrders")).append("\n");
        sb.append("Failed Payments,").append(summary.getSummary().get("failedPayments")).append("\n\n");
        
        if (trends.isEmpty()) {
            sb.append("No report data available\n");
            return sb.toString().getBytes();
        }

        sb.append("period,totalSales,totalOrders,totalProductsSold\n");
        for (SalesTrendResponse t : trends) {
            sb.append(escapeCsv(t.getPeriod())).append(",")
              .append(t.getTotalSales()).append(",")
              .append(t.getTotalOrders()).append(",")
              .append(t.getTotalProductsSold()).append("\n");
        }
        return sb.toString().getBytes();
    }

    class ReportPageEvent extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            try {
                PdfContentByte canvas = writer.getDirectContentUnder();
                // Watermark
                canvas.saveState();
                BaseFont bfWatermark = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.EMBEDDED);
                canvas.beginText();
                canvas.setColorFill(new Color(235, 235, 235));
                canvas.setFontAndSize(bfWatermark, 70);
                canvas.showTextAligned(Element.ALIGN_CENTER, "Heritcraft", document.getPageSize().getWidth() / 2, document.getPageSize().getHeight() / 2, 45);
                canvas.endText();
                canvas.restoreState();

                PdfContentByte over = writer.getDirectContent();
                // Border
                over.saveState();
                over.setLineWidth(2f);
                over.setColorStroke(Color.BLACK);
                float margin = 20;
                over.rectangle(margin, margin, document.getPageSize().getWidth() - 2 * margin, document.getPageSize().getHeight() - 2 * margin);
                over.setLineWidth(1f);
                over.rectangle(margin + 5, margin + 5, document.getPageSize().getWidth() - 2 * (margin + 5), document.getPageSize().getHeight() - 2 * (margin + 5));
                over.stroke();
                over.restoreState();

                // Footer
                over.saveState();
                BaseFont bfFooter = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.EMBEDDED);
                over.beginText();
                over.setColorFill(Color.DARK_GRAY);
                over.setFontAndSize(bfFooter, 10);
                String footerText = "Generated by HeritCraft - Page " + writer.getPageNumber();
                over.showTextAligned(Element.ALIGN_CENTER, footerText, document.getPageSize().getWidth() / 2, margin + 15, 0);
                over.endText();
                over.restoreState();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void buildPdfLayout(Document document, ReportSummaryResponse summary, List<SalesTrendResponse> trends, boolean isAdmin) throws Exception {
        Font titleFont = new Font(Font.TIMES_ROMAN, 24, Font.BOLD, new Color(212, 175, 55));
        Font sectionFont = new Font(Font.TIMES_ROMAN, 14, Font.BOLD, new Color(212, 175, 55));
        Font boldHelvetica = new Font(Font.HELVETICA, 11, Font.BOLD, Color.BLACK);
        Font normalHelvetica = new Font(Font.HELVETICA, 11, Font.NORMAL, Color.DARK_GRAY);
        Font smallHelvetica = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.DARK_GRAY);
        Font headerHelvetica = new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE);

        // 1. HERITCRAFT title at top-left
        Paragraph heritcraft = new Paragraph("HERITCRAFT", titleFont);
        heritcraft.setAlignment(Element.ALIGN_LEFT);
        document.add(heritcraft);

        // 2. Report title
        String reportTitleStr = isAdmin ? "Admin Platform Sales Report" : "Seller Sales Report";
        Paragraph reportTitle = new Paragraph(reportTitleStr, new Font(Font.HELVETICA, 16, Font.BOLD, Color.BLACK));
        reportTitle.setAlignment(Element.ALIGN_LEFT);
        reportTitle.setSpacingAfter(15);
        document.add(reportTitle);

        // 3. Report Information section
        PdfPTable infoTable = new PdfPTable(2);
        infoTable.setWidthPercentage(100);
        infoTable.setSpacingBefore(10);
        infoTable.setSpacingAfter(15);
        
        PdfPCell infoHeaderCell = new PdfPCell(new Phrase("REPORT INFORMATION", headerHelvetica));
        infoHeaderCell.setBackgroundColor(Color.DARK_GRAY);
        infoHeaderCell.setColspan(2);
        infoHeaderCell.setPadding(5);
        infoTable.addCell(infoHeaderCell);

        if (isAdmin) {
            infoTable.addCell(new Phrase("Platform Name", boldHelvetica));
            infoTable.addCell(new Phrase("HeritCraft", normalHelvetica));
            infoTable.addCell(new Phrase("Generated By", boldHelvetica));
            infoTable.addCell(new Phrase((String) summary.getAdmin().get("adminName"), normalHelvetica));
            infoTable.addCell(new Phrase("Report Scope", boldHelvetica));
            infoTable.addCell(new Phrase("Platform-wide", normalHelvetica));
        } else {
            infoTable.addCell(new Phrase("Shop Name", boldHelvetica));
            infoTable.addCell(new Phrase((String) summary.getSeller().get("shopName"), normalHelvetica));
            infoTable.addCell(new Phrase("Seller Name", boldHelvetica));
            infoTable.addCell(new Phrase((String) summary.getSeller().get("sellerName"), normalHelvetica));
            infoTable.addCell(new Phrase("Seller ID", boldHelvetica));
            infoTable.addCell(new Phrase(String.valueOf(summary.getSeller().get("sellerId")), normalHelvetica));
        }

        infoTable.addCell(new Phrase("Report Type", boldHelvetica));
        infoTable.addCell(new Phrase(summary.getReportType().toUpperCase(), normalHelvetica));
        infoTable.addCell(new Phrase("Start Date", boldHelvetica));
        infoTable.addCell(new Phrase((String) summary.getDateRange().get("startDate"), normalHelvetica));
        infoTable.addCell(new Phrase("End Date", boldHelvetica));
        infoTable.addCell(new Phrase((String) summary.getDateRange().get("endDate"), normalHelvetica));
        infoTable.addCell(new Phrase("Generated On", boldHelvetica));
        infoTable.addCell(new Phrase(summary.getGeneratedAt(), normalHelvetica));

        for (PdfPRow row : infoTable.getRows()) {
            for (PdfPCell cell : row.getCells()) {
                if (cell != null) {
                    cell.setPadding(5);
                    cell.setBorderColor(Color.LIGHT_GRAY);
                }
            }
        }
        document.add(infoTable);

        // 4. Executive Summary section
        double revenue = isAdmin ? 
            (summary.getSummary().get("totalPlatformRevenue") != null ? ((Number) summary.getSummary().get("totalPlatformRevenue")).doubleValue() : 0.0) : 
            (summary.getSummary().get("totalSales") != null ? ((Number) summary.getSummary().get("totalSales")).doubleValue() : 0.0);
        int totalOrders = summary.getSummary().get("totalOrders") != null ? ((Number) summary.getSummary().get("totalOrders")).intValue() : 0;
        int totalProductsSold = trends.stream().mapToInt(SalesTrendResponse::getTotalProductsSold).sum();
        double avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0.0;
        
        int totalReviews = summary.getSummary().get("totalReviews") != null ? ((Number) summary.getSummary().get("totalReviews")).intValue() : 0;
        double avgRating = summary.getSummary().get("averageRating") != null ? ((Number) summary.getSummary().get("averageRating")).doubleValue() : 0.0;

        Paragraph execSummaryTitle = new Paragraph("EXECUTIVE SUMMARY", sectionFont);
        execSummaryTitle.setSpacingAfter(5);
        document.add(execSummaryTitle);

        PdfPTable execTable = new PdfPTable(2);
        execTable.setWidthPercentage(100);
        execTable.setSpacingAfter(15);
        execTable.getDefaultCell().setBorder(0);
        execTable.getDefaultCell().setPadding(3);
        
        execTable.addCell(new Phrase("Total Revenue:", boldHelvetica));
        execTable.addCell(new Phrase(String.format("Rs.%.2f", revenue), normalHelvetica));
        execTable.addCell(new Phrase("Total Orders:", boldHelvetica));
        execTable.addCell(new Phrase(String.valueOf(totalOrders), normalHelvetica));
        execTable.addCell(new Phrase("Products Sold:", boldHelvetica));
        execTable.addCell(new Phrase(String.valueOf(totalProductsSold), normalHelvetica));
        execTable.addCell(new Phrase("Average Order Value:", boldHelvetica));
        execTable.addCell(new Phrase(String.format("Rs.%.2f", avgOrderValue), normalHelvetica));
        if (isAdmin) {
            execTable.addCell(new Phrase("Total Reviews:", boldHelvetica));
            execTable.addCell(new Phrase(String.valueOf(totalReviews), normalHelvetica));
            execTable.addCell(new Phrase("Average Rating:", boldHelvetica));
            execTable.addCell(new Phrase(String.format("%.1f", avgRating), normalHelvetica));
        }
        document.add(execTable);

        // 5. Sales Trend Analysis
        Paragraph trendTitle = new Paragraph("SALES TREND ANALYSIS", sectionFont);
        trendTitle.setSpacingAfter(5);
        document.add(trendTitle);

        if (trends == null || trends.isEmpty()) {
            document.add(new Paragraph("No report data available for the selected range.", smallHelvetica));
            document.add(new Paragraph("\n"));
        } else {
            PdfPTable trendTable = new PdfPTable(4);
            trendTable.setWidthPercentage(100);
            trendTable.setSpacingAfter(15);
            String[] headers = {"Period", "Orders", "Products Sold", "Revenue"};
            for (String h : headers) {
                PdfPCell c = new PdfPCell(new Phrase(h, headerHelvetica));
                c.setBackgroundColor(Color.DARK_GRAY);
                c.setPadding(5);
                trendTable.addCell(c);
            }
            for (SalesTrendResponse t : trends) {
                trendTable.addCell(new Phrase(t.getPeriod(), normalHelvetica));
                trendTable.addCell(new Phrase(String.valueOf(t.getTotalOrders()), normalHelvetica));
                trendTable.addCell(new Phrase(String.valueOf(t.getTotalProductsSold()), normalHelvetica));
                trendTable.addCell(new Phrase(String.format("Rs.%.2f", t.getTotalSales()), normalHelvetica));
            }
            for (PdfPRow row : trendTable.getRows()) {
                for (PdfPCell cell : row.getCells()) {
                    if (cell != null) {
                        cell.setPadding(5);
                        cell.setBorderColor(Color.LIGHT_GRAY);
                    }
                }
            }
            document.add(trendTable);
        }

        // 6. Top Selling Products
        Paragraph topProductsTitle = new Paragraph("TOP SELLING PRODUCTS", sectionFont);
        topProductsTitle.setSpacingAfter(5);
        document.add(topProductsTitle);

        List<Map<String, Object>> topProducts = summary.getTopProducts();
        if (topProducts == null || topProducts.isEmpty()) {
            document.add(new Paragraph("No products sold in this period.", smallHelvetica));
            document.add(new Paragraph("\n"));
        } else {
            PdfPTable topTable = new PdfPTable(3);
            topTable.setWidthPercentage(100);
            topTable.setSpacingAfter(15);
            String[] headers = {"Product Name", "Quantity Sold", "Revenue"};
            for (String h : headers) {
                PdfPCell c = new PdfPCell(new Phrase(h, headerHelvetica));
                c.setBackgroundColor(Color.DARK_GRAY);
                c.setPadding(5);
                topTable.addCell(c);
            }
            for (Map<String, Object> p : topProducts) {
                topTable.addCell(new Phrase(String.valueOf(p.get("name")), normalHelvetica));
                topTable.addCell(new Phrase(String.valueOf(p.get("sold")), normalHelvetica));
                topTable.addCell(new Phrase("N/A", normalHelvetica));
            }
            for (PdfPRow row : topTable.getRows()) {
                for (PdfPCell cell : row.getCells()) {
                    if (cell != null) {
                        cell.setPadding(5);
                        cell.setBorderColor(Color.LIGHT_GRAY);
                    }
                }
            }
            document.add(topTable);
        }

        // 7. Stock Analysis
        Paragraph stockTitle = new Paragraph("STOCK ANALYSIS", sectionFont);
        stockTitle.setSpacingAfter(5);
        document.add(stockTitle);
        
        Object lowStock = summary.getSummary().get("lowStockProducts");
        int lowStockCount = lowStock != null ? ((Number) lowStock).intValue() : 0;
        PdfPTable stockTable = new PdfPTable(2);
        stockTable.setWidthPercentage(100);
        stockTable.setSpacingAfter(15);
        stockTable.getDefaultCell().setBorder(0);
        stockTable.getDefaultCell().setPadding(3);
        stockTable.addCell(new Phrase("Low Stock Products:", boldHelvetica));
        stockTable.addCell(new Phrase(String.valueOf(lowStockCount), normalHelvetica));
        stockTable.addCell(new Phrase("Out of Stock Products:", boldHelvetica));
        stockTable.addCell(new Phrase("N/A", normalHelvetica));
        document.add(stockTable);

        // 8. Payment Summary
        Paragraph paymentTitle = new Paragraph("PAYMENT SUMMARY", sectionFont);
        paymentTitle.setSpacingAfter(5);
        document.add(paymentTitle);

        double pdfCodRev = summary.getSummary().get("codRevenue") != null ? ((Number) summary.getSummary().get("codRevenue")).doubleValue() : 0.0;
        double pdfRazRev = summary.getSummary().get("razorpayRevenue") != null ? ((Number) summary.getSummary().get("razorpayRevenue")).doubleValue() : 0.0;
        double pdfPenCod = summary.getSummary().get("pendingCodAmount") != null ? ((Number) summary.getSummary().get("pendingCodAmount")).doubleValue() : 0.0;
        int pdfPaid = summary.getSummary().get("paidOrders") != null ? ((Number) summary.getSummary().get("paidOrders")).intValue() : 0;
        int pdfFailed = summary.getSummary().get("failedPayments") != null ? ((Number) summary.getSummary().get("failedPayments")).intValue() : 0;

        PdfPTable payTable = new PdfPTable(2);
        payTable.setWidthPercentage(100);
        payTable.setSpacingAfter(15);
        payTable.getDefaultCell().setBorder(0);
        payTable.getDefaultCell().setPadding(3);
        payTable.addCell(new Phrase("COD Revenue:", boldHelvetica));
        payTable.addCell(new Phrase(String.format("Rs.%.2f", pdfCodRev), normalHelvetica));
        payTable.addCell(new Phrase("Razorpay Online Revenue:", boldHelvetica));
        payTable.addCell(new Phrase(String.format("Rs.%.2f", pdfRazRev), normalHelvetica));
        payTable.addCell(new Phrase("Pending COD Amount:", boldHelvetica));
        payTable.addCell(new Phrase(String.format("Rs.%.2f", pdfPenCod), normalHelvetica));
        payTable.addCell(new Phrase("Paid Orders:", boldHelvetica));
        payTable.addCell(new Phrase(String.valueOf(pdfPaid), normalHelvetica));
        payTable.addCell(new Phrase("Failed Payments:", boldHelvetica));
        payTable.addCell(new Phrase(String.valueOf(pdfFailed), normalHelvetica));
        document.add(payTable);

        // 9. Report Note
        Paragraph note = new Paragraph("Revenue is calculated from non-cancelled orders.", new Font(Font.HELVETICA, 10, Font.ITALIC, Color.GRAY));
        note.setAlignment(Element.ALIGN_CENTER);
        note.setSpacingBefore(10);
        document.add(note);
    }

    public byte[] generateSellerPdf(Long sellerId, String range, String start, String end, AuthUserResponse user) {
        ReportSummaryResponse summary = getSellerSummary(sellerId, range, start, end, user);
        List<SalesTrendResponse> trends = getSellerSalesTrend(sellerId, range, start, end);

        Document document = new Document();
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, bos);
            writer.setPageEvent(new ReportPageEvent());
            document.open();
            buildPdfLayout(document, summary, trends, false);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return bos.toByteArray();
    }

    // ================= ADMIN REPORTS =================

    public ReportSummaryResponse getAdminSummary(String range, String start, String end, AuthUserResponse user) {
        LocalDateTime[] dates = getDateRange(range, start, end);
        List<Order> orders = orderRepository.findAll()
                .stream().filter(o -> isValidOrder(o, dates[0], dates[1])).collect(Collectors.toList());

        double totalSales = 0.0;
        double codRevenue = 0.0;
        double razorpayRevenue = 0.0;
        double pendingCodAmount = 0.0;
        int paidOrders = 0;
        int failedPayments = 0;
        int totalProductsSold = 0;
        Map<String, Integer> productSales = new HashMap<>();

        for (Order order : orders) {
            double amount = order.getTotalAmount() != null ? order.getTotalAmount() : 0.0;
            totalSales += amount;
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    int qty = item.getQuantity() != null ? item.getQuantity() : 1;
                    totalProductsSold += qty;
                    productSales.put(item.getProductName(), productSales.getOrDefault(item.getProductName(), 0) + qty);
                }
            }

            String payMethod = order.getPaymentMethod();
            String payStatus = order.getPaymentStatus();
            
            boolean isRazorpay = "RAZORPAY".equalsIgnoreCase(payMethod);
            boolean isCOD = "COD".equalsIgnoreCase(payMethod) || "Cash on Delivery".equalsIgnoreCase(payMethod);
            
            if (isRazorpay) {
                if ("PAID".equalsIgnoreCase(payStatus)) {
                    razorpayRevenue += amount;
                    paidOrders++;
                } else if ("FAILED".equalsIgnoreCase(payStatus)) {
                    failedPayments++;
                }
            } else if (isCOD) {
                if ("COD_PENDING".equalsIgnoreCase(payStatus) || "PENDING".equalsIgnoreCase(payStatus)) {
                    pendingCodAmount += amount;
                } else if ("PAID".equalsIgnoreCase(payStatus)) {
                    codRevenue += amount;
                    paidOrders++;
                }
            } else {
                if ("COD_PENDING".equalsIgnoreCase(payStatus) || "PENDING".equalsIgnoreCase(payStatus)) {
                    pendingCodAmount += amount;
                } else if ("PAID".equalsIgnoreCase(payStatus)) {
                    codRevenue += amount;
                    paidOrders++;
                }
            }
        }

        List<Product> products = productRepository.findAll();
        List<Review> reviews = reviewRepository.findAll();
        
        double avgRating = reviews.isEmpty() ? 0.0 : reviews.stream().mapToInt(r -> r.getRating() != null ? r.getRating() : 0).average().orElse(0.0);
        long pendingSellers = products.stream().map(Product::getSellerId).distinct().count(); // Dummy placeholder

        ReportSummaryResponse res = new ReportSummaryResponse();
        res.setBrandName("HeritCraft");
        res.setReportTitle("Admin Platform Sales Report");
        res.setReportType(range != null ? range : "daily");
        res.setGeneratedAt(LocalDateTime.now().format(DATE_FORMATTER));
        
        Map<String, String> dateRange = new HashMap<>();
        dateRange.put("startDate", dates[0].format(DAY_FORMATTER));
        dateRange.put("endDate", dates[1].format(DAY_FORMATTER));
        res.setDateRange(dateRange);

        Map<String, Object> adminMap = new HashMap<>();
        adminMap.put("adminName", user.getName());
        adminMap.put("adminEmail", user.getEmail());
        res.setAdmin(adminMap);
        
        Map<String, Object> platMap = new HashMap<>();
        platMap.put("scope", "All sellers");
        platMap.put("platformName", "HeritCraft");
        res.setPlatform(platMap);

        Map<String, Object> sumMap = new HashMap<>();
        sumMap.put("totalPlatformRevenue", totalSales);
        sumMap.put("totalOrders", orders.size());
        sumMap.put("totalBuyers", orders.stream().map(Order::getUserId).distinct().count());
        sumMap.put("totalSellers", products.stream().map(Product::getSellerId).distinct().count());
        sumMap.put("totalProducts", products.size());
        sumMap.put("totalReviews", reviews.size());
        sumMap.put("averageRating", avgRating);
        sumMap.put("pendingSellers", 0); // Need user service for real pending sellers
        sumMap.put("codRevenue", codRevenue);
        sumMap.put("razorpayRevenue", razorpayRevenue);
        sumMap.put("pendingCodAmount", pendingCodAmount);
        sumMap.put("paidOrders", paidOrders);
        sumMap.put("failedPayments", failedPayments);
        sumMap.put("totalBuyers", orders.stream().map(Order::getUserId).distinct().count());
        sumMap.put("totalSellers", products.stream().map(Product::getSellerId).distinct().count());
        sumMap.put("totalProducts", products.size());
        sumMap.put("totalReviews", reviews.size());
        sumMap.put("averageRating", avgRating);
        sumMap.put("pendingSellers", 0); // Need user service for real pending sellers
        res.setSummary(sumMap);

        List<Map<String, Object>> topProds = productSales.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .limit(5)
            .map(e -> {
                Map<String, Object> m = new HashMap<>();
                m.put("name", e.getKey());
                m.put("sold", e.getValue());
                return m;
            }).collect(Collectors.toList());
        res.setTopProducts(topProds);

        return res;
    }

    public List<SalesTrendResponse> getAdminSalesTrend(String range, String start, String end) {
        LocalDateTime[] dates = getDateRange(range, start, end);
        List<Order> orders = orderRepository.findAll()
                .stream().filter(o -> isValidOrder(o, dates[0], dates[1])).collect(Collectors.toList());

        Map<String, SalesTrendResponse> trendMap = new TreeMap<>();
        
        for (Order order : orders) {
            String period = getPeriodKey(order.getCreatedAt(), range);
            SalesTrendResponse tr = trendMap.computeIfAbsent(period, p -> new SalesTrendResponse(p, 0.0, 0, 0));
            
            tr.setTotalSales(tr.getTotalSales() + (order.getTotalAmount() != null ? order.getTotalAmount() : 0.0));
            tr.setTotalOrders(tr.getTotalOrders() + 1);
            
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    tr.setTotalProductsSold(tr.getTotalProductsSold() + (item.getQuantity() != null ? item.getQuantity() : 1));
                }
            }
        }
        return new ArrayList<>(trendMap.values());
    }

    public byte[] generateAdminCsv(String range, String start, String end, AuthUserResponse user) {
        ReportSummaryResponse summary = getAdminSummary(range, start, end, user);
        List<SalesTrendResponse> trends = getAdminSalesTrend(range, start, end);

        StringBuilder sb = new StringBuilder();
        sb.append("Brand,HeritCraft\n");
        sb.append("Report Title,").append(summary.getReportTitle()).append("\n");
        sb.append("Report Type,").append(summary.getReportType()).append("\n");
        sb.append("Generated At,").append(summary.getGeneratedAt()).append("\n");
        sb.append("Start Date,").append(summary.getDateRange().get("startDate")).append("\n");
        sb.append("End Date,").append(summary.getDateRange().get("endDate")).append("\n");
        sb.append("Admin Name,").append(escapeCsv((String) summary.getAdmin().get("adminName"))).append("\n\n");
        
        sb.append("NOTE: Revenue is calculated from non-cancelled orders.\n");
        sb.append("COD Revenue,").append(summary.getSummary().get("codRevenue")).append("\n");
        sb.append("Razorpay Revenue,").append(summary.getSummary().get("razorpayRevenue")).append("\n");
        sb.append("Pending COD Amount,").append(summary.getSummary().get("pendingCodAmount")).append("\n");
        sb.append("Paid Orders,").append(summary.getSummary().get("paidOrders")).append("\n");
        sb.append("Failed Payments,").append(summary.getSummary().get("failedPayments")).append("\n\n");
        
        if (trends.isEmpty()) {
            sb.append("No report data available\n");
            return sb.toString().getBytes();
        }

        sb.append("period,totalSales,totalOrders,totalProductsSold\n");
        for (SalesTrendResponse t : trends) {
            sb.append(escapeCsv(t.getPeriod())).append(",")
              .append(t.getTotalSales()).append(",")
              .append(t.getTotalOrders()).append(",")
              .append(t.getTotalProductsSold()).append("\n");
        }
        return sb.toString().getBytes();
    }

    public byte[] generateAdminPdf(String range, String start, String end, AuthUserResponse user) {
        ReportSummaryResponse summary = getAdminSummary(range, start, end, user);
        List<SalesTrendResponse> trends = getAdminSalesTrend(range, start, end);

        Document document = new Document();
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, bos);
            writer.setPageEvent(new ReportPageEvent());
            document.open();
            buildPdfLayout(document, summary, trends, true);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return bos.toByteArray();
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            val = val.replace("\"", "\"\"");
            return "\"" + val + "\"";
        }
        return val;
    }
}
