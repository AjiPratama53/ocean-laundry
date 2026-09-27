FROM quay.io/keycloak/keycloak:26.0
COPY keycloak/ocean-laundry-realm.json /opt/keycloak/data/import/ocean-laundry-realm.json
CMD ["start-dev", "--import-realm"]