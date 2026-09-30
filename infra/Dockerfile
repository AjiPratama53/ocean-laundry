FROM quay.io/keycloak/keycloak:26.0 AS builder

ENV KC_DB=postgres

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.0
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Copy realm to the import directory
COPY infra/keycloak/ocean-laundry-realm.json /opt/keycloak/data/import/ocean-laundry-realm.json

# Use start-dev so it does not hang on Infinispan cluster discovery
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]