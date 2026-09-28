<template>
    <v-card class="p-8 flex flex-col items-center gap-4">
        <img src="@/assets/catalogue_empty.svg" alt="No packages">
        <v-col class="flex flex-col items-center">
            <h2 class="font-bold text-2xl">Tidak Ada Paket Ditemukan</h2>
            <p>
                Tidak ditemukan paket laundry yang cocok dengan kriteria pencarian
            </p>
            <p class="bg-blue-100 text-cyan-700 font-medium px-2 py-1 rounded-xl">"
                {{
                    search
                }}"</p>
        </v-col>
        <v-btn class="bg-cyan-700 text-cyan-50" size="large" prepend-icon="mdi-plus-circle-outline"
            text="Buat Paket Baru" />
    </v-card>

</template>

<script setup lang="ts">
defineProps<{
    search: string,
}>()
</script>

<style scoped></style>