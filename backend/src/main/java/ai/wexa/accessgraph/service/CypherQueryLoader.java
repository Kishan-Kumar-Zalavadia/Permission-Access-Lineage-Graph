package ai.wexa.accessgraph.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Loads .cypher query files from src/main/resources/cypher/ as plain strings.
 *
 * Keeping the query text in standalone .cypher files (rather than inline Java
 * strings) means the exact same query can be pasted straight into the CognoDB
 * console for manual verification, and it's the same file referenced in the
 * README's "main queries explained" section — one source of truth.
 */
@Component
public class CypherQueryLoader {

    public String load(String filename) {
        try {
            ClassPathResource resource = new ClassPathResource("cypher/" + filename);
            try (InputStream in = resource.getInputStream()) {
                return new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Could not load Cypher query file: " + filename, e);
        }
    }
}
