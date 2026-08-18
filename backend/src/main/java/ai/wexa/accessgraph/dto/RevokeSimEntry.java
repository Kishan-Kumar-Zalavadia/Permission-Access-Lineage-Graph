package ai.wexa.accessgraph.dto;

/** A resource reached via the role being simulated for revocation. */
public record RevokeSimEntry(String id, String name, String permission) {
}
