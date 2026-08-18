package ai.wexa.accessgraph.dto;

import java.util.List;

/**
 * Result of simulating a role revocation for a user: the set difference
 * between "everything reachable via the role being revoked" and "everything
 * still reachable via other paths (e.g. team-inherited default role)".
 */
public record RevokeSimulationResult(
        String userId,
        String roleIdToRevoke,
        List<RevokeSimEntry> actuallyLost,
        List<RevokeSimEntry> retainedAnyway
) {
}
