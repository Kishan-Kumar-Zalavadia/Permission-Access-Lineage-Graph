package ai.wexa.accessgraph.controller;

import ai.wexa.accessgraph.dto.AccessSource;
import ai.wexa.accessgraph.dto.ResourceAccess;
import ai.wexa.accessgraph.dto.RevokeSimulationResult;
import ai.wexa.accessgraph.dto.RoleSummary;
import ai.wexa.accessgraph.dto.UserSummary;
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
     * GET /api/users
     * All users, for the person-selector in the UI.
     */
    @GetMapping("/api/users")
    public List<UserSummary> getUsers() {
        return service.listUsers();
    }

    /**
     * GET /api/users/{userId}/roles
     * A user's directly-assigned roles only. Kept for simple callers;
     * prefer /access-sources for the full revoke-simulation selector.
     */
    @GetMapping("/api/users/{userId}/roles")
    public List<RoleSummary> getUserRoles(@PathVariable String userId) {
        return service.getDirectRoles(userId);
    }

    /**
     * GET /api/users/{userId}/access-sources
     * Every selectable access source for this user — BOTH directly-assigned
     * roles and specific team-inherited roles — for the revoke-simulation UI.
     */
    @GetMapping("/api/users/{userId}/access-sources")
    public List<AccessSource> getAccessSources(@PathVariable String userId) {
        return service.listAccessSources(userId);
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
     * GET /api/users/{userId}/simulate-revoke?source=direct_role:role-admin&source=team_default_role:team-finance:role-editor
     * The centerpiece query: what does this user actually lose if we revoke
     * ALL of the selected access sources at once (any mix of direct roles
     * and team-inherited roles), accounting for anything they'd retain
     * anyway through sources NOT selected?
     */
    @GetMapping("/api/users/{userId}/simulate-revoke")
    public RevokeSimulationResult simulateRevoke(
            @PathVariable String userId,
            @RequestParam List<String> source) {
        return service.simulateRevoke(userId, source);
    }
}
