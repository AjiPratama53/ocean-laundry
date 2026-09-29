FROM quay.io/keycloak/keycloak:26.0 AS builder

# Build configuration options
ENV KC_DB=postgres
ENV KC_CACHE=local

# Optimize Keycloak build for these options
RUN /opt/keycloak/bin/kc.sh build

# Runtime Stage
FROM quay.io/keycloak/keycloak:26.0
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Copy the realm JSON directly into the runtime image's import folder
COPY infra/keycloak/ocean-laundry-realm.json /opt/keycloak/data/import/ocean-laundry-realm.json

ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized", "--import-realm"]