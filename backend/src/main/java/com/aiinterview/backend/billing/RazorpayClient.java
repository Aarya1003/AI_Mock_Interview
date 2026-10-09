package com.aiinterview.backend.billing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class RazorpayClient {
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${razorpay.key-id:}")
    private String keyId;

    @Value("${razorpay.key-secret:}")
    private String keySecret;

    @Value("${razorpay.webhook-secret:}")
    private String webhookSecret;

    private String getAuthHeader() {
        String credentials = keyId + ":" + keySecret;
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes());
    }

    public JsonNode createCustomer(String email, String name, String contact) {
        String url = "https://api.razorpay.com/v1/customers";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", getAuthHeader());

        Map<String, Object> request = Map.of(
                "email", email,
                "name", name,
                "contact", contact
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        return parseResponse(response.getBody());
    }

    public JsonNode createSubscription(String customerId, String planId, int totalCount) {
        String url = "https://api.razorpay.com/v1/subscriptions";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", getAuthHeader());

        Map<String, Object> request = Map.of(
                "plan_id", planId,
                "customer_id", customerId,
                "total_count", totalCount,
                "quantity", 1
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        return parseResponse(response.getBody());
    }

    public JsonNode getSubscription(String subscriptionId) {
        String url = "https://api.razorpay.com/v1/subscriptions/" + subscriptionId;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", getAuthHeader());
        HttpEntity<?> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        return parseResponse(response.getBody());
    }

    public JsonNode cancelSubscription(String subscriptionId, boolean cancelAtPeriodEnd) {
        String url = "https://api.razorpay.com/v1/subscriptions/" + subscriptionId + "/cancel";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", getAuthHeader());

        Map<String, Object> request = Map.of(
                "cancel_at_period_end", cancelAtPeriodEnd
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        return parseResponse(response.getBody());
    }

    public JsonNode createOrder(int amount, String currency, String receipt) {
        String url = "https://api.razorpay.com/v1/orders";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", getAuthHeader());

        Map<String, Object> request = Map.of(
                "amount", amount,
                "currency", currency,
                "receipt", receipt
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        return parseResponse(response.getBody());
    }

    public JsonNode getPayment(String paymentId) {
        String url = "https://api.razorpay.com/v1/payments/" + paymentId;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", getAuthHeader());
        HttpEntity<?> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        return parseResponse(response.getBody());
    }

    public boolean verifyWebhookSignature(String payload, String signature) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(
                    webhookSecret.getBytes(), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(payload.getBytes());
            String calculatedSignature = bytesToHex(hash);
            return calculatedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Webhook signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    private JsonNode parseResponse(String body) {
        try {
            return objectMapper.readTree(body);
        } catch (Exception e) {
            log.error("Failed to parse Razorpay response: {}", e.getMessage());
            throw new RuntimeException("Invalid response from Razorpay", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public String getKeyId() {
        return keyId;
    }
}