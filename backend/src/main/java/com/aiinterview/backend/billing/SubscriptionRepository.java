package com.aiinterview.backend.billing;

import com.aiinterview.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findByUser(User user);
    Optional<Subscription> findByRazorpaySubscriptionId(String razorpaySubscriptionId);
    List<Subscription> findByUserAndStatusIn(User user, List<Subscription.Status> statuses);
}