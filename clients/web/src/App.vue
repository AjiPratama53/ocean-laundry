<template>
  <v-app>
    <drawer />
    <v-main class="bg-blue-50">
      <v-container class="py-8">
        <!-- Every workflow has its own URL (A.2.1): all UI renders through
             the router so screens are linkable, bookmarkable, reload-safe. -->
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'

import Drawer from './components/Drawer.vue'

const session = useSessionStore()

onMounted(() => session.load())

</script>
