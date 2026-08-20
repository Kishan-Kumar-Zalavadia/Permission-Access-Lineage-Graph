package ai.wexa.accessgraph.dto;

import java.util.List;

/**
 * Result of simulating a revocation across one or more access sources: the
 * set difference between "everything reachable via any selected source" and
 * "everything still reachable via sources NOT selected for revocation".
 */
public record RevokeSimulationResult(
        String userId,
        List<String> revokedSources,
        List<RevokeSimEntry> actuallyLost,
        List<RevokeSimEntry> retainedAnyway
) {
}
