package com.aiinterview.backend.role;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {
    private final RoleRepository roleRepository;

    @GetMapping
    public ResponseEntity<?> getAllRoles() {
        List<RoleEntity> roles = roleRepository.findByCustomFalseOrderByCategoryAscNameAsc();
        Map<String, List<RoleResponse>> grouped = roles.stream()
                .collect(Collectors.groupingBy(
                        RoleEntity::getCategory,
                        Collectors.mapping(this::toResponse, Collectors.toList())
                ));
        return ResponseEntity.ok(grouped);
    }

    @GetMapping("/custom")
    public ResponseEntity<?> getCustomRoles() {
        List<RoleEntity> roles = roleRepository.findByCustomTrue();
        return ResponseEntity.ok(roles.stream().map(this::toResponse).toList());
    }

    @PostMapping("/custom")
    public ResponseEntity<?> createCustomRole(@RequestBody CustomRoleRequest request) {
        RoleEntity role = RoleEntity.builder()
                .name(request.name())
                .category("Custom")
                .description(request.description())
                .topics(request.topics())
                .custom(true)
                .build();
        roleRepository.save(role);
        return ResponseEntity.ok(toResponse(role));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRole(@PathVariable Long id) {
        return roleRepository.findById(id)
                .map(this::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private RoleResponse toResponse(RoleEntity role) {
        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.getCategory(),
                role.getDescription(),
                role.getTopics(),
                role.isCustom()
        );
    }

    public record RoleResponse(
            Long id,
            String name,
            String category,
            String description,
            List<String> topics,
            boolean custom
    ) {}

    public record CustomRoleRequest(
            String name,
            String description,
            List<String> topics
    ) {}
}