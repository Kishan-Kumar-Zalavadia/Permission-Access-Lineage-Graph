package ai.wexa.accessgraph.dto;

import java.util.List;

/**
 * One resource a user can reach, the permission level(s) granted, and every
 * distinct path (direct role vs. team-inherited role) that leads to it.
 * A resource can legitimately appear with multiple access paths at once —
 * that overlap is the whole point of this data model.
 */
public record ResourceAccess(
        String resourceId,
        String resourceName,
        String resourceType,
        List<String> permissions,
        List<AccessPath> accessPaths
) {
    public record AccessPath(String pathType, String viaRole, String viaTeam) {
    }
}
