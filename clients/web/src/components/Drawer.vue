<template>
    <v-navigation-drawer permanent color="primary" width="300">
        <div class="h-lvh flex flex-col justify-between">
            <v-list>
                <v-list-item :title="displayName" :subtitle="roleLabel" />
                <v-divider></v-divider>
                <!-- One menu per role, decided by the shared activeMenu in
                     stores/session (staff > courier > customer). UX only
                     (A.2.2) — the service enforces scopes, see A.9. -->
                <template v-if="menu === 'staff'">
                    <v-list-item prepend-icon="mdi-archive-outline" link title="Daftar Paket Laundry"
                        to="/staff/packages" />
                    <v-list-item prepend-icon="mdi-scale" link title="Perlu Ditimbang"
                        to="/staff/orders?status=picked_up" />
                    <v-list-item prepend-icon="mdi-washing-machine" link title="Tracking & Riwayat"
                        to="/staff/orders" />
                </template>
                <template v-else-if="menu === 'courier'">
                    <v-list-item prepend-icon="mdi-truck" link title="Penjemputan" to="/courier/pickups" />
                    <v-list-item prepend-icon="mdi-package-variant-closed" link title="Pengantaran"
                        to="/courier/deliveries" />
                    <v-list-item prepend-icon="mdi-washing-machine" link title="Semua Order" to="/orders" />
                </template>
                <template v-else-if="menu === 'customer'">
                    <v-list-item prepend-icon="mdi-archive-outline" link title="Katalog Laundry"
                        to="/customer/catalogue" />
                    <v-list-item prepend-icon="mdi-invoice-text-outline" link title="Pesanan Saya"
                        to="/customer/orders" />
                    <v-list-item prepend-icon="mdi-cart-plus" link title="Buat Order" to="/customer/orders/new" />
                </template>
                <!-- Signed in but the token carries no domain scope: say so
                     plainly instead of showing another role's menu. The fix
                     is Keycloak-side (assign client scopes to the user). -->
                <template v-else-if="menu === 'unassigned'">
                    <v-list-item prepend-icon="mdi-home-outline" link title="Beranda" to="/" />
                    <v-list-item prepend-icon="mdi-alert-circle-outline" title="Tanpa peran"
                        subtitle="Akun ini belum punya hak akses" />
                </template>
                <!-- Anonymous -->
            </v-list>
            <v-list>
                <v-list-item v-if="session.isSignedIn" link prepend-icon="mdi-logout" title="Keluar"
                    @click="session.signOut()" />
                <v-list-item v-else link prepend-icon="mdi-login" title="Masuk" to="/login" />
                <v-divider />
                <v-list-item class="logo">
                    <img src="../assets/Ocean Laundry Logo.svg" />
                </v-list-item>
            </v-list>
        </div>
    </v-navigation-drawer>

</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

/** The one role decision shared with the post-login landing. */
const menu = computed(() => session.activeMenu)
const displayName = computed(() => session.subject || (session.isSignedIn ? 'Pengguna' : 'Tamu'))
const roleLabel = computed(() =>
    menu.value === 'unassigned' ? 'tanpa peran' : session.primaryRole,
)
</script>

<style scoped>
.logo {
    display: flex;
    justify-content: center;
    padding-block: 1rem;
}
</style>
