package ai.wexa.accessgraph.service;

import ai.wexa.accessgraph.dto.AccessSource;
import ai.wexa.accessgraph.dto.ResourceAccess;
import ai.wexa.accessgraph.dto.RevokeSimEntry;
import ai.wexa.accessgraph.dto.RevokeSimulationResult;
import ai.wexa.accessgraph.dto.RoleSummary;
import ai.wexa.accessgraph.dto.UserSummary;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Session;
import org.neo4j.driver.exceptions.ServiceUnavailableException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AccessGraphService {

    private static final String DIRECT_PREFIX = "direct_role:";
    private static final String TEAM_PREFIX = "team_default_role:";

    private final Driver driver;
    private final String resolveAccessQuery;
    private final String simulateRevokeQuery;
    private final String listUsersQuery;
    private final String userDirectRolesQuery;
    private final String listAccessSourcesQuery;

    public AccessGraphService(Driver driver, CypherQueryLoader queryLoader) {
        this.driver = driver;
        this.resolveAccessQuery = queryLoader.load("01_resolve_user_access.cypher");
        this.simulateRevokeQuery = queryLoader.load("02_simulate_revoke.cypher");
        this.listUsersQuery = queryLoader.load("03_list_users.cypher");
        this.userDirectRolesQuery = queryLoader.load("04_user_direct_roles.cypher");
        this.listAccessSourcesQuery = queryLoader.load("05_list_access_sources.cypher");
    }

    /** All users, for the person-selector in the UI. */
    public List<UserSummary> listUsers() {
        try (Session session = driver.session()) {
            return session.run(listUsersQuery).list(record -> new UserSummary(
                    record.get("id").asString(),
                    record.get("name").asString(),
                    record.get("email").asString()
            ));
        } catch (ServiceUnavailableException e) {
            throw new GraphUnavailableException("CognoDB is unreachable", e);
        }
    }

    /** A user's directly-assigned roles only. Kept for backward compatibility / simple callers. */
    public List<RoleSummary> getDirectRoles(String userId) {
        try (Session session = driver.session()) {
            return session.run(userDirectRolesQuery, Map.of("userId", userId)).list(record -> new RoleSummary(
                    record.get("id").asString(),
                    record.get("name").asString(),
                    record.get("level").asInt(),
                    record.get("assignedAt").asString()
            ));
        } catch (ServiceUnavailableException e) {
            throw new GraphUnavailableException("CognoDB is unreachable", e);
        }
    }

    /**
     * Every selectable access source for a user — BOTH directly-assigned
     * roles and specific team-inherited roles — so the revoke-simulation UI
     * can offer both, not just direct assignments.
     */
    public List<AccessSource> listAccessSources(String userId) {
        try (Session session = driver.session()) {
            return session.run(listAccessSourcesQuery, Map.of("userId", userId)).list(record -> {
                String pathType = record.get("pathType").asString();
                String roleId = record.get("roleId").asString();
                String roleName = record.get("roleName").asString();
                String teamId = record.get("teamId").isNull() ? null : record.get("teamId").asString();
                String teamName = record.get("teamName").isNull() ? null : record.get("teamName").asString();

                String sourceId = pathType.equals("direct_role")
                        ? DIRECT_PREFIX + roleId
                        : TEAM_PREFIX + teamId + ":" + roleId;

                return new AccessSource(sourceId, pathType, roleId, roleName, teamId, teamName);
            });
        } catch (ServiceUnavailableException e) {
            throw new GraphUnavailableException("CognoDB is unreachable", e);
        }
    }

    /**
     * Resolves every resource a user can reach, and via which path(s) —
     * direct role assignment, team-inherited default role, or both.
     * Every parameter is bound (never string-concatenated) via the driver's
     * parameter map, so this is safe against Cypher injection.
     */
    public List<ResourceAccess> resolveUserAccess(String userId) {
        try (Session session = driver.session()) {
            List<Record> records = session.run(resolveAccessQuery, Map.of("userId", userId)).list();
            return records.stream().map(this::toResourceAccess).collect(Collectors.toList());
        } catch (ServiceUnavailableException e) {
            throw new GraphUnavailableException("CognoDB is unreachable", e);
        }
    }

    /**
     * Simulates revoking a SET of access sources at once — any mix of
     * directly-assigned roles and specific team-inherited roles — and
     * computes what the user actually loses vs. retains through every
     * source NOT selected for revocation.
     *
     * sourceIds are opaque strings produced by listAccessSources(), of the
     * form "direct_role:{roleId}" or "team_default_role:{teamId}:{roleId}".
     */
    public RevokeSimulationResult simulateRevoke(String userId, List<String> sourceIds) {
        List<String> revokedDirectRoleIds = new ArrayList<>();
        List<Map<String, Object>> revokedTeamRolePairs = new ArrayList<>();

        for (String sourceId : sourceIds) {
            if (sourceId.startsWith(DIRECT_PREFIX)) {
                revokedDirectRoleIds.add(sourceId.substring(DIRECT_PREFIX.length()));
            } else if (sourceId.startsWith(TEAM_PREFIX)) {
                String remainder = sourceId.substring(TEAM_PREFIX.length());
                int sep = remainder.indexOf(':');
                if (sep < 0) {
                    throw new IllegalArgumentException("Malformed team source id: " + sourceId);
                }
                Map<String, Object> pair = new HashMap<>();
                pair.put("teamId", remainder.substring(0, sep));
                pair.put("roleId", remainder.substring(sep + 1));
                revokedTeamRolePairs.add(pair);
            } else {
                throw new IllegalArgumentException("Unrecognized source id: " + sourceId);
            }
        }

        try (Session session = driver.session()) {
            Record record = session.run(simulateRevokeQuery, Map.of(
                    "userId", userId,
                    "revokedDirectRoleIds", revokedDirectRoleIds,
                    "revokedTeamRolePairs", revokedTeamRolePairs
            )).single();

            List<RevokeSimEntry> lost = toRevokeSimEntries(record, "actuallyLost");
            List<RevokeSimEntry> retained = toRevokeSimEntries(record, "retainedAnyway");

            return new RevokeSimulationResult(userId, sourceIds, lost, retained);
        } catch (ServiceUnavailableException e) {
            throw new GraphUnavailableException("CognoDB is unreachable", e);
        }
    }

    private ResourceAccess toResourceAccess(Record record) {
        List<String> permissions = record.get("permissions").asList(v -> v.asString());
        List<ResourceAccess.AccessPath> accessPaths = record.get("accessPaths").asList(this::toAccessPath);

        return new ResourceAccess(
                record.get("resourceId").asString(),
                record.get("resourceName").asString(),
                record.get("resourceType").asString(),
                permissions,
                accessPaths
        );
    }

    private ResourceAccess.AccessPath toAccessPath(org.neo4j.driver.Value value) {
        return new ResourceAccess.AccessPath(
                value.get("pathType").asString(),
                value.get("viaRole").asString(),
                value.get("viaTeam").isNull() ? null : value.get("viaTeam").asString()
        );
    }

    private List<RevokeSimEntry> toRevokeSimEntries(Record record, String field) {
        return record.get(field).asList(v -> new RevokeSimEntry(
                v.get("id").asString(),
                v.get("name").asString(),
                v.get("permission").asString()
        ));
    }

    /** Thrown when CognoDB cannot be reached; mapped to HTTP 503 by the controller advice. */
    public static class GraphUnavailableException extends RuntimeException {
        public GraphUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
