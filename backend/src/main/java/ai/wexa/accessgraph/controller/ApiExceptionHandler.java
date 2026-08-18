package ai.wexa.accessgraph.controller;

import ai.wexa.accessgraph.service.AccessGraphService.GraphUnavailableException;
import org.neo4j.driver.exceptions.NoSuchRecordException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Turns backend/database failures into clean, informative HTTP responses
 * instead of leaking stack traces to the frontend — the assignment
 * explicitly calls for graceful handling of an unreachable database.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(GraphUnavailableException.class)
    public ResponseEntity<Map<String, String>> handleGraphUnavailable(GraphUnavailableException e) {
        log.error("CognoDB unreachable while serving a request", e);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "error", "database_unavailable",
                        "message", "The graph database is currently unreachable. Please try again shortly."
                ));
    }

    @ExceptionHandler(NoSuchRecordException.class)
    public ResponseEntity<Map<String, String>> handleNoSuchRecord(NoSuchRecordException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                        "error", "not_found",
                        "message", "No matching user or role was found for this request."
                ));
    }
}
