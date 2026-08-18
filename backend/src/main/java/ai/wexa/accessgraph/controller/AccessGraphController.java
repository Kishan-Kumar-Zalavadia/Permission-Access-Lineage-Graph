package ai.wexa.accessgraph.controller;

import ai.wexa.accessgraph.dto.ResourceAccess;
import ai.wexa.accessgraph.dto.RevokeSimulationResult;
import ai.wexa.accessgraph.service.AccessGraphService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AccessGraphController {

    private final AccessGraphService service;

    public AccessGraphController(AccessGraphService service) {
        this.service = service;
    }

    /**
     * GET /api/users/{userId}/access
     * Everything a user can reach, and via which path(s) — the "audit view".
     */
    @GetMapping("/api/users/{userId}/access")
    public List<ResourceAccess> getUserAccess(@PathVariable String userId) {
        return service.resolveUserAccess(userId);
    }

    /**
     * GET /api/users/{userId}/simulate-revoke?roleId=role-admin
     * The centerpiece query: what does this user actually lose if we revoke
     * this specific directly-assigned role, accounting for anything they'd
     * retain anyway through team-inherited access?
     */
    @GetMapping("/api/users/{userId}/simulate-revoke")
    public RevokeSimulationResult simulateRevoke(
            @PathVariable String userId,
            @RequestParam String roleId) {
        return service.simulateRevoke(userId, roleId);
    }
}
