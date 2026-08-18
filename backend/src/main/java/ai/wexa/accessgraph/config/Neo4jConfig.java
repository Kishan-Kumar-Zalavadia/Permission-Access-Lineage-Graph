package ai.wexa.accessgraph.config;

import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.neo4j.driver.exceptions.ServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires up a single shared Neo4j {@link Driver} instance for the whole application.
 *
 * CognoDB speaks openCypher over Bolt 5.0-5.4 and is fully compatible with the
 * official Neo4j drivers, so no custom SDK is needed — just point the standard
 * driver at the bolt+s:// URI CognoDB Cloud gives you.
 *
 * Connection details are injected from environment variables (see
 * application.properties) and are never hardcoded or committed to source control.
 */
@Configuration
public class Neo4jConfig {

    private static final Logger log = LoggerFactory.getLogger(Neo4jConfig.class);

    @Value("${cognodb.uri}")
    private String uri;

    @Value("${cognodb.username}")
    private String username;

    @Value("${cognodb.password}")
    private String password;

    @Bean(destroyMethod = "close")
    public Driver neo4jDriver() {
        Driver driver = GraphDatabase.driver(uri, AuthTokens.basic(username, password));
        try {
            // Fail fast with a clear log message at startup rather than surfacing
            // a confusing error on the first real request.
            driver.verifyConnectivity();
            log.info("Connected to CognoDB at {}", uri);
        } catch (ServiceUnavailableException e) {
            log.error("Could not reach CognoDB at {}. The application will still start, " +
                    "but graph-backed endpoints will return 503 until the database is reachable. " +
                    "Check COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD.", uri, e);
        }
        return driver;
    }
}
