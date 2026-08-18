package ai.wexa.accessgraph.service;

import ai.wexa.accessgraph.dto.ResourceAccess;
import ai.wexa.accessgraph.dto.RevokeSimEntry;
import ai.wexa.accessgraph.dto.RevokeSimulationResult;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Session;
import org.neo4j.driver.exceptions.ServiceUnavailableException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AccessGraphService {

    private final Driver driver;
    private final String resolveAccessQuery;
    private final String simulateRevokeQuery;

    public AccessGraphService(Driver driver, CypherQueryLoader queryLoader) {
        this.driver = driver;
        this.resolveAccessQuery = queryLoader.load("01_resolve_user_access.cypher");
        this.simulateRevokeQuery = queryLoader.load("02_simulate_revoke.cypher");
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
     * Simulates revoking a directly-assigned role and computes the set
     * difference between what the role alone grants and what the user
     * retains through independent paths (e.g. team membership).
     */
    public RevokeSimulationResult simulateRevoke(String userId, String roleIdToRevoke) {
        try (Session session = driver.session()) {
            Record record = session.run(simulateRevokeQuery,
                    Map.of("userId", userId, "roleIdToRevoke", roleIdToRevoke)).single();

            List<RevokeSimEntry> lost = toRevokeSimEntries(record, "actuallyLost");
            List<RevokeSimEntry> retained = toRevokeSimEntries(record, "retainedAnyway");

            return new RevokeSimulationResult(userId, roleIdToRevoke, lost, retained);
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
                value.get("viaRole").asString()
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
