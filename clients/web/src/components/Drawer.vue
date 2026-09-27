<template>
    <v-navigation-drawer permanent color="primary" width="300">
        <div class="h-lvh flex flex-col justify-between">
            <v-list>
                <v-list-item prepend-avatar="../assets/logo.svg" :title="username" :subtitle="role"></v-list-item>
                <v-divider></v-divider>
                <slot />
            </v-list>
            <v-list>
                <v-list-item link prepend-icon="mdi-cog-outline" title="Pengaturan"></v-list-item>
                <v-divider />
                <v-list-item class="logo">
                    <img src="../assets/Ocean Laundry Logo.svg" />
                </v-list-item>
            </v-list>
        </div>
    </v-navigation-drawer>

</template>

<script setup lang="ts">
defineProps<{
    username: string,
    role: string
}>();
</script>

<style scoped>
.logo {
    display: flex;
    justify-content: center;
    padding-block: 1rem;
}
</style>
