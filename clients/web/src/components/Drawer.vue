<template>
    <v-navigation-drawer permanent color="primary" width="300">
        <div class="h-lvh flex flex-col justify-between">
            <v-list>
                <v-list-item :title="displayName" />
                <v-divider></v-divider>
                <!-- Scope-filtered menu (UX only, A.2.2 — the service enforces,
                     see A.9): only pages this token can open (NAV_ITEMS in the
                     router mirrors each route guard), so a menu entry never
                     leads to /forbidden. -->
                <template v-if="!session.isSignedIn">
                    <v-list-item prepend-icon="mdi-home-outline" link title="Beranda" to="/" />
                </template>
                <template v-else-if="visibleItems.length === 0">
                    <v-list-item prepend-icon="mdi-home-outline" link title="Beranda" to="/" />
                    <v-list-item prepend-icon="mdi-alert-circle-outline" title="Tanpa akses"
                        subtitle="Akun ini belum punya hak akses" />
                </template>
                <template v-else>
                    <v-list-item v-for="item in visibleItems" :key="item.title + item.to" :prepend-icon="item.icon" link
                        :title="item.title" :to="item.to" />
                </template>
            </v-list>
            <v-list>
                <v-list-item class="logo">
                    <img src="../assets/Ocean Laundry Logo.svg" />
                </v-list-item>
            </v-list>
        </div>
    </v-navigation-drawer>

</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NAV_ITEMS } from '@/router'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

/** Account header: username from the IdP token. */
const displayName = computed(() => session.username || session.subject || (session.isSignedIn ? 'Pengguna' : 'Tamu'))

/** Only menu entries whose guard scopes the token holds. */
const visibleItems = computed(() => {
    const have = new Set(session.scopes)
    const allowedItems = NAV_ITEMS.filter((item) => item.requiredAnyScopes.some((s) => have.has(s)))
    return allowedItems.filter((item, index) =>
        allowedItems.findIndex((candidate) => candidate.to === item.to) === index,
    )
})
</script>

<style scoped>
.logo {
    display: flex;
    justify-content: center;
    padding-block: 1rem;
}
</style>
