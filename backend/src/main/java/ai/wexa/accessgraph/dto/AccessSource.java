package ai.wexa.accessgraph.dto;

/**
 * One selectable "source" of access for a user: either a directly-assigned
 * role, or a specific team's inherited default role. The sourceId is an
 * opaque string the frontend passes back verbatim to select this source for
 * revocation — see AccessGraphService#parseSourceIds for the encoding.
 */
public record AccessSource(
        String sourceId,
        String pathType,
        String roleId,
        String roleName,
        String teamId,
        String teamName
) {
}
