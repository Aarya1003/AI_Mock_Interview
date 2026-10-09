package com.aiinterview.backend.auth;

import com.aiinterview.backend.user.User;
import com.aiinterview.backend.user.UserRepository;
import com.aiinterview.backend.security.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .role(User.Role.USER)
                .plan(User.Plan.FREE)
                .build();

        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", userToResponse(user)
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setLastLoginAt(java.time.LocalDateTime.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", userToResponse(user)
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@org.springframework.security.core.annotation.AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userToResponse(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@org.springframework.security.core.annotation.AuthenticationPrincipal User user, @Valid @RequestBody ProfileUpdateRequest request) {
        if (request.firstName() != null) user.setFirstName(request.firstName());
        if (request.lastName() != null) user.setLastName(request.lastName());
        userRepository.save(user);
        return ResponseEntity.ok(userToResponse(user));
    }

    @PutMapping("/password")
    public ResponseEntity<?> changePassword(@org.springframework.security.core.annotation.AuthenticationPrincipal User user, @Valid @RequestBody PasswordChangeRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect"));
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

   private Map<String, Object> userToResponse(User user) {
    Map<String, Object> response = new java.util.HashMap<>();

    response.put("id", user.getId());
    response.put("email", user.getEmail());
    response.put("firstName", user.getFirstName());
    response.put("lastName", user.getLastName());
    response.put("fullName", user.getFullName().trim());
    response.put("role", user.getRole().name());
    response.put("plan", user.getPlan().name());
    response.put("createdAt", user.getCreatedAt());
    response.put("lastLoginAt", user.getLastLoginAt());

    return response;
}
    public record SignupRequest(
            @jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank String email,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(min = 8) String password,
            @jakarta.validation.constraints.NotBlank String firstName,
            @jakarta.validation.constraints.NotBlank String lastName
    ) {}

    public record LoginRequest(
            @jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank String email,
            @jakarta.validation.constraints.NotBlank String password
    ) {}

    public record ProfileUpdateRequest(
            String firstName,
            String lastName
    ) {}

    public record PasswordChangeRequest(
            @jakarta.validation.constraints.NotBlank String currentPassword,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(min = 8) String newPassword
    ) {}
}