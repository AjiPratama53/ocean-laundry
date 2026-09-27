FROM quay.io/keycloak/keycloak:26.0 as builder

ENV KC_DB=postgres

# Salin file realm ke folder import internal
COPY infra/keycloak/ocean-laundry-realm.json /opt/keycloak/data/import/ocean-laundry-realm.json

# Jalankan build agar konfigurasi tersimpan di image
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.0
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Perintah wajib untuk Production + Import Realm
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized", "--import-realm"]