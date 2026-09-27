<template>
    <div class="flex flex-col gap-8">
        <div class="flex gap-32">
            <div class="flex flex-col gap-1">
                <p class="text-cyan-700">
                    <span>
                        <v-icon icon="mdi-circle-small" />
                    </span>
                    KATALOG PERAWATAN PAKAIAN MODERN
                </p>
                <h1 class="font-bold text-4xl">Katalog Layanan & Paket Ocean Laundry</h1>
                <p>Temukan paket OceanLaundry yang diinginkan dengan perawatan pakaian higienis, deterjen
                    ramah lingkungan, serta layanan antar-jemput gratis.</p>
            </div>
            <v-card class="p-4">
                <div class="flex gap-4">
                    <div class="flex items-center gap-2">
                        <div class="bg-blue-50 h-2/3 p-1 flex items-center">
                            <v-icon class="text-blue-600" icon="mdi-check-decagram-outline" />
                        </div>
                        <div class="flex flex-col">
                            <p class="font-bold">100% Higienis</p>
                            <p class="font-light">Standar Medis UV-C</p>
                        </div>
                    </div>
                    <div class="flex items-center  gap-2">
                        <div class="bg-blue-50 h-2/3 p-1 flex items-center">
                            <v-icon class="text-green-600" icon="mdi-truck" color="blue-darken-2" />
                        </div>

                        <div class="flex flex-col">
                            <p class="font-bold">Gratis Antar-Jemput</p>
                            <p class="font-light">Min. Order 3 Kg</p>
                        </div>
                    </div>
                </div>
            </v-card>
        </div>
        <v-card class="p-4 flex gap-8 items-center">
            <v-text-field prepend-inner-icon="mdi-magnify" placeholder="Cari paket..." variant="outlined" clearable
                single-line hide-details />
            <p>Menampilkan <span class="font-bold">{{ packages.length }}</span> paket</p>
        </v-card>
        <div class="grid grid-cols-3 gap-6">
            <v-card class="p-6 border-t-8 border-blue-400" v-for="servicePackage in packages" :key="servicePackage.id"
                v-slot:text>
                <div class="flex flex-col gap-4">
                    <h2 class="font-bold text-3xl">{{ servicePackage.name }}</h2>
                    <div class="flex items-center justify-between bg-blue-100 p-2 rounded-lg">
                        <p>Tarif Layanan</p>
                        <span class="inline-flex items-end">
                            <p class="font-bold text-3xl text-cyan-700">Rp {{ formatPrice(servicePackage.price) }}</p>
                            <p>/kg</p>
                        </span>
                    </div>
                    <span>
                        <p class="font-light">
                            <v-icon class="text-green-700" icon="mdi-check-circle-outline" />
                            {{ servicePackage.description }}
                        </p>
                    </span>
                    <v-btn class="bg-cyan-700 text-blue-50" text="Pilih Paket & Pesan" block size="x-large"
                        append-icon="mdi-cart-plus" />
                </div>
            </v-card>
        </div>
    </div>

</template>

<script setup lang="ts">
const formatPrice = (price: number) => new Intl.NumberFormat('id-ID').format(price);

const packages = [
    {
        "id": "pkg_002",
        "name": "Express Wash",
        "description": "Cuci lipat 1 hari",
        "price": 6000
    },
    {
        "id": "pkg_f717daab-e4a0-4c24-bc2e-930a451d0299",
        "name": "Uji Coba",
        "description": "blablabla",
        "price": 10000
    },
    {
        "id": "pkg_001",
        "name": "Regular Wash",
        "description": "Cuci lipat 2 hari",
        "price": 6000
    }
]
</script>

<style scoped></style>