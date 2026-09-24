<template>
  <v-app>
    <v-app-bar density="comfortable" flat>
      <v-app-bar-title>
        <router-link to="/" class="text-decoration-none text-high-emphasis font-weight-bold">
          🌊 Ocean Laundry
        </router-link>
      </v-app-bar-title>
      <template #append>
        <!-- Navigation reflects role as UX only (A.2.2); hiding a link grants nothing. -->
        <template v-if="session.isSignedIn">
          <v-btn to="/packages" variant="text">Packages</v-btn>
          <v-btn to="/orders" variant="text">Orders</v-btn>
          <v-btn v-if="canOrder" to="/orders/new" variant="text">New order</v-btn>
          <v-chip class="mx-2" size="small" variant="outlined">{{ session.primaryRole }}</v-chip>
          <v-btn variant="outlined" @click="session.signOut()">Sign out</v-btn>
        </template>
        <v-btn v-else to="/signin" color="primary" variant="flat">Sign in</v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <v-container max-width="1000">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
onMounted(() => session.load())

const canOrder = computed(() => !session.isSignedIn || session.scopes.includes('orders:write'))
</script>
