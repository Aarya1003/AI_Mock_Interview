package com.aiinterview.backend.billing;

import com.aiinterview.backend.user.User;
import com.aiinterview.backend.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

    private final RazorpayClient razorpayClient;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    @Transactional
    public SubscriptionResponse createSubscription(User user, String planId) {
        // Check if user already has active subscription
        List<Subscription> existing = subscriptionRepository.findByUserAndStatusIn(user,
                List.of(Subscription.Status.ACTIVE, Subscription.Status.PENDING));
        if (!existing.isEmpty()) {
            throw new IllegalStateException("User already has an active or pending subscription");
        }

        // Create Razorpay customer if not exists
        String customerId = getOrCreateCustomerId(user);

        // Create subscription
        JsonNode subscription = razorpayClient.createSubscription(customerId, planId, 12); // 12 months

        Subscription sub = Subscription.builder()
                .user(user)
                .razorpaySubscriptionId(subscription.get("id").asText())
                .razorpayPlanId(planId)
                .razorpayCustomerId(customerId)
                .status(Subscription.Status.PENDING)
                .currentPeriodStart(LocalDateTime.now())
                .currentPeriodEnd(LocalDateTime.now().plusMonths(1))
                .build();

        subscriptionRepository.save(sub);

        return new SubscriptionResponse(
                subscription.get("id").asText(),
                subscription.get("short_url") != null ? subscription.get("short_url").asText() : null,
                subscription.get("status").asText()
        );
    }

    @Transactional
    public void handleSubscriptionActivated(String razorpaySubscriptionId) {
        Subscription sub = subscriptionRepository.findByRazorpaySubscriptionId(razorpaySubscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found: " + razorpaySubscriptionId));

        sub.setStatus(Subscription.Status.ACTIVE);
        subscriptionRepository.save(sub);

        // Upgrade user to PRO
        User user = sub.getUser();
        user.setPlan(User.Plan.PRO);
        userRepository.save(user);
    }

    @Transactional
    public void handleSubscriptionCancelled(String razorpaySubscriptionId) {
        Subscription sub = subscriptionRepository.findByRazorpaySubscriptionId(razorpaySubscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found: " + razorpaySubscriptionId));

        sub.setStatus(Subscription.Status.CANCELLED);
        subscriptionRepository.save(sub);

        // Downgrade user to FREE
        User user = sub.getUser();
        user.setPlan(User.Plan.FREE);
        userRepository.save(user);
    }

    @Transactional
    public void handlePaymentCaptured(JsonNode paymentNode) {
        String paymentId = paymentNode.get("id").asText();
        String orderId = paymentNode.get("order_id").asText();
        String subscriptionId = paymentNode.has("subscription_id") ? paymentNode.get("subscription_id").asText() : null;
        int amount = paymentNode.get("amount").asInt();
        String method = paymentNode.get("method").asText();
        String description = paymentNode.has("description") ? paymentNode.get("description").asText() : "";

        Payment payment = Payment.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(orderId)
                .razorpaySubscriptionId(subscriptionId)
                .amount(amount)
                .status(Payment.Status.CAPTURED)
                .paymentMethod(method)
                .description(description)
                .build();

        paymentRepository.save(payment);
    }

    @Transactional
    public void handlePaymentFailed(JsonNode paymentNode) {
        String paymentId = paymentNode.get("id").asText();
        String orderId = paymentNode.get("order_id").asText();
        int amount = paymentNode.get("amount").asInt();

        Payment payment = Payment.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(orderId)
                .amount(amount)
                .status(Payment.Status.FAILED)
                .build();

        paymentRepository.save(payment);
    }

    public Subscription getActiveSubscription(User user) {
        return subscriptionRepository.findByUserAndStatusIn(user,
                List.of(Subscription.Status.ACTIVE))
                .stream().findFirst().orElse(null);
    }

    public List<Payment> getPaymentHistory(User user) {
        return paymentRepository.findByUserOrderByCreatedAtDesc(user);
    }

    private String getOrCreateCustomerId(User user) {
        Subscription existing = subscriptionRepository.findByUser(user).orElse(null);
        if (existing != null && existing.getRazorpayCustomerId() != null) {
            return existing.getRazorpayCustomerId();
        }

        JsonNode customer = razorpayClient.createCustomer(
                user.getEmail(),
                user.getFullName().trim(),
                "" // Contact optional
        );

        return customer.get("id").asText();
    }

    @Transactional
    public void cancelSubscription(User user, String razorpaySubscriptionId) {
        Subscription sub = subscriptionRepository.findByRazorpaySubscriptionId(razorpaySubscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));

        if (!sub.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Subscription does not belong to user");
        }

        // Cancel at period end in Razorpay
        razorpayClient.cancelSubscription(razorpaySubscriptionId, true);

        // Update local subscription
        sub.setCancelAtPeriodEnd(true);
        sub.setStatus(Subscription.Status.CANCELLED);
        subscriptionRepository.save(sub);
    }

    public record SubscriptionResponse(
            String subscriptionId,
            String checkoutUrl,
            String status
    ) {}
}