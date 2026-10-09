package com.aiinterview.backend.billing;

import com.aiinterview.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {
    private final BillingService billingService;
    private final RazorpayClient razorpayClient;

    @PostMapping("/create-subscription")
    public ResponseEntity<?> createSubscription(@AuthenticationPrincipal User user, @RequestBody CreateSubscriptionRequest request) {
        BillingService.SubscriptionResponse response = billingService.createSubscription(user, request.planId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/subscription")
    public ResponseEntity<?> getSubscription(@AuthenticationPrincipal User user) {
        Subscription sub = billingService.getActiveSubscription(user);
        if (sub == null) {
            return ResponseEntity.ok(Map.of("status", "none", "plan", user.getPlan().name()));
        }
        return ResponseEntity.ok(Map.of(
                "id", sub.getId(),
                "razorpaySubscriptionId", sub.getRazorpaySubscriptionId(),
                "status", sub.getStatus().name(),
                "currentPeriodStart", sub.getCurrentPeriodStart(),
                "currentPeriodEnd", sub.getCurrentPeriodEnd(),
                "cancelAtPeriodEnd", sub.getCancelAtPeriodEnd(),
                "plan", user.getPlan().name()
        ));
    }

    @GetMapping("/payments")
    public ResponseEntity<?> getPayments(@AuthenticationPrincipal User user) {
        List<Payment> payments = billingService.getPaymentHistory(user);
        return ResponseEntity.ok(payments.stream().map(this::toPaymentResponse).toList());
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(HttpServletRequest request, @RequestBody String payload) {
        String signature = request.getHeader("X-Razorpay-Signature");

        if (signature == null || !razorpayClient.verifyWebhookSignature(payload, signature)) {
            return ResponseEntity.status(400).body(Map.of("error", "Invalid signature"));
        }

        try {
            com.fasterxml.jackson.databind.JsonNode event = new com.fasterxml.jackson.databind.ObjectMapper().readTree(payload);
            String eventType = event.get("event").asText();
            com.fasterxml.jackson.databind.JsonNode entity = event.get("payload").get("subscription").get("entity");

            switch (eventType) {
                case "subscription.activated" -> billingService.handleSubscriptionActivated(entity.get("id").asText());
                case "subscription.cancelled" -> billingService.handleSubscriptionCancelled(entity.get("id").asText());
                case "subscription.charged" -> {
                    com.fasterxml.jackson.databind.JsonNode paymentEntity = event.get("payload").get("payment").get("entity");
                    billingService.handlePaymentCaptured(paymentEntity);
                }
                case "subscription.payment_failed" -> {
                    com.fasterxml.jackson.databind.JsonNode paymentEntity = event.get("payload").get("payment").get("entity");
                    billingService.handlePaymentFailed(paymentEntity);
                }
            }

            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        return ResponseEntity.ok(Map.of(
                "keyId", razorpayClient.getKeyId(),
                "plans", Map.of(
                        "pro_monthly", Map.of(
                                "id", "plan_pro_monthly",
                                "name", "Pro Monthly",
                                "price", 999,
                                "currency", "INR",
                                "interval", "month"
                        ),
                        "pro_yearly", Map.of(
                                "id", "plan_pro_yearly",
                                "name", "Pro Yearly",
                                "price", 9999,
                                "currency", "INR",
                                "interval", "year"
                        )
                )
        ));
    }

    @PostMapping("/subscription/{subscriptionId}/cancel")
    public ResponseEntity<?> cancelSubscription(@AuthenticationPrincipal User user, @PathVariable String subscriptionId) {
        billingService.cancelSubscription(user, subscriptionId);
        return ResponseEntity.ok(Map.of("message", "Subscription cancelled at period end"));
    }

    private Map<String, Object> toPaymentResponse(Payment p) {
        return Map.of(
                "id", p.getId(),
                "razorpayPaymentId", p.getRazorpayPaymentId(),
                "amount", p.getAmount(),
                "currency", p.getCurrency(),
                "status", p.getStatus().name(),
                "paymentMethod", p.getPaymentMethod(),
                "description", p.getDescription(),
                "createdAt", p.getCreatedAt()
        );
    }

    public record CreateSubscriptionRequest(String planId) {}
}