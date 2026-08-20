package ai.wexa.accessgraph.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the frontend (served from a different origin/port during local dev,
 * and from a different domain entirely once deployed) to call this API.
 *
 * The allowed origins are read from an env var so the same code works in
 * local dev (Vite on :5173) and once deployed (e.g. a Vercel URL) without
 * hardcoding either.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String allowedOrigins = System.getenv().getOrDefault(
                "ALLOWED_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173"
        );

        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
