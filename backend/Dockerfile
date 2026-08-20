# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Cache dependencies separately from source so code-only changes rebuild faster
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# ---- Runtime stage ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/access-graph-0.1.0.jar app.jar

# Render/Railway inject PORT at runtime; application.properties already
# reads server.port=${PORT:8080}, so no extra config needed here.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
