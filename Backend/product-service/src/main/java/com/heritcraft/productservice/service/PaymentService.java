package com.heritcraft.productservice.service;

import com.heritcraft.productservice.dto.*;
import com.heritcraft.productservice.entity.*;
import com.heritcraft.productservice.repository.*;
import com.razorpay.RazorpayClient;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Service
public class PaymentService {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    
    private final RestTemplate restTemplate = new RestTemplate();
    private static final String USER_SERVICE_ME_URL = "http://127.0.0.1:8081/api/auth/me";

    public PaymentService(
            ProductRepository productRepository,
            OrderRepository orderRepository,
            PaymentRepository paymentRepository
    ) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
    }

    public PaymentOrderResponse createRazorpayOrder(PaymentOrderRequest request, String authHeader) {
        AuthUserResponse loggedInUser = getLoggedInUser(authHeader);
        OrderRequest orderRequest = request.getOrderRequest();
        
        if (orderRequest == null || orderRequest.getItems() == null || orderRequest.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid order request details.");
        }

        // Recalculate amount from database product data
        double subtotal = 0.0;
        int totalQuantity = 0;

        for (OrderItem item : orderRequest.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found: " + item.getProductId()));

            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int orderQty = item.getQuantity() == null ? 1 : item.getQuantity();

            if (currentStock < orderQty) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock for product: " + product.getName() + " (Available: " + currentStock + ")");
            }

            double price = product.getPrice() != null ? product.getPrice() : 0.0;
            subtotal += price * orderQty;
            totalQuantity += orderQty;
        }

        double shipping = totalQuantity >= 3 ? 0.0 : 50.0;
        double tax = Math.round(subtotal * 0.02);
        double recalculatedTotal = subtotal + shipping + tax;

        // Convert rupees to paise
        int amountInPaise = (int) Math.round(recalculatedTotal * 100);

        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            
            JSONObject orderReq = new JSONObject();
            orderReq.put("amount", amountInPaise);
            orderReq.put("currency", "INR");
            orderReq.put("receipt", request.getReceipt() != null ? request.getReceipt() : "heritcraft_receipt_" + System.currentTimeMillis());

            com.razorpay.Order rzpOrder = client.orders.create(orderReq);
            String rzpOrderId = rzpOrder.get("id");

            return new PaymentOrderResponse(keyId, rzpOrderId, amountInPaise, "INR");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create Razorpay payment order: " + e.getMessage());
        }
    }

    public Order verifyPaymentAndCreateOrder(PaymentVerifyRequest request, String authHeader) {
        AuthUserResponse loggedInUser = getLoggedInUser(authHeader);
        
        boolean signatureValid = verifySignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature(),
                keySecret
        );

        if (!signatureValid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment verification failed: Invalid signature.");
        }

        OrderRequest orderRequest = request.getOrderRequest();
        if (orderRequest == null || orderRequest.getItems() == null || orderRequest.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid order request details.");
        }

        // Validate stock again to prevent concurrency issues
        for (OrderItem item : orderRequest.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found: " + item.getProductId()));

            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int orderQty = item.getQuantity() == null ? 1 : item.getQuantity();

            if (currentStock < orderQty) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock for product: " + product.getName());
            }
        }

        // Deduct stock after verification succeeds
        for (OrderItem item : orderRequest.getItems()) {
            Product product = productRepository.findById(item.getProductId()).get();
            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int currentSold = product.getSoldQuantity() == null ? 0 : product.getSoldQuantity();
            int orderQty = item.getQuantity() == null ? 1 : item.getQuantity();

            product.setStock(currentStock - orderQty);
            product.setSoldQuantity(currentSold + orderQty);
            productRepository.save(product);
        }

        // Create the final paid order
        Order order = new Order();
        order.setUserId(orderRequest.getUserId());
        order.setUserName(orderRequest.getUserName());
        order.setUserEmail(orderRequest.getUserEmail());
        order.setItems(orderRequest.getItems());
        order.setSubtotal(orderRequest.getSubtotal());
        order.setShipping(orderRequest.getShipping());
        order.setTax(orderRequest.getTax());
        order.setTotalAmount(orderRequest.getTotalAmount());
        
        order.setPaymentMethod("RAZORPAY");
        order.setPaymentStatus("PAID");
        order.setOrderStatus("PLACED");
        
        order.setFullName(orderRequest.getFullName());
        order.setPhone(orderRequest.getPhone());
        order.setZip(orderRequest.getZip());
        order.setAddress(orderRequest.getAddress());
        order.setCity(orderRequest.getCity());
        order.setState(orderRequest.getState());

        order.setPaymentProvider("RAZORPAY");
        order.setTransactionId(request.getRazorpayPaymentId());
        order.setRazorpayOrderId(request.getRazorpayOrderId());
        order.setRazorpayPaymentId(request.getRazorpayPaymentId());
        order.setRazorpaySignature(request.getRazorpaySignature());
        order.setPaidAt(LocalDateTime.now());
        
        order.onCreate();

        Order savedOrder = orderRepository.save(order);

        // Save a confirmed payment record
        Payment payment = new Payment();
        payment.setOrderId(savedOrder.getId());
        payment.setUserId(savedOrder.getUserId());
        payment.setUserEmail(savedOrder.getUserEmail());
        payment.setAmount(savedOrder.getTotalAmount());
        payment.setPaymentMethod("RAZORPAY");
        payment.setPaymentStatus("PAID");
        payment.setRefundStatus("NOT_REFUNDED");
        payment.setTransactionId(request.getRazorpayPaymentId());
        payment.onCreate();

        paymentRepository.save(payment);

        return savedOrder;
    }

    private boolean verifySignature(String orderId, String paymentId, String signature, String secret) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret_key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secret_key);
            byte[] hash = sha256_HMAC.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                hexString.append(String.format("%02x", b));
            }
            return hexString.toString().equals(signature);
        } catch (Exception e) {
            return false;
        }
    }

    private AuthUserResponse getLoggedInUser(String authHeader) {
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", authHeader);
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.http.ResponseEntity<AuthUserResponse> response =
                    restTemplate.exchange(
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
