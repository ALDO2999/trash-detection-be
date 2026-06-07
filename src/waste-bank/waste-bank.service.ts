import { Injectable } from '@nestjs/common';

export interface WasteBank {
  id: string;
  name: string;
  address: string;
  city: string;
  openHours: string;
  latitude: number;
  longitude: number;
}

// Data lokasi bank sampah / titik drop-off.
// Disimpan statis di service (reference data) — bisa dipindah ke DB di kemudian hari.
const WASTE_BANKS: WasteBank[] = [
  {
    id: 'wb-001',
    name: 'Bank Sampah Sejahtera',
    address: 'Jl. Kebangsaan No. 12',
    city: 'Jakarta Selatan',
    openHours: 'Senin–Sabtu, 08.00–17.00',
    latitude: -6.2615,
    longitude: 106.8106,
  },
  {
    id: 'wb-002',
    name: 'Bank Sampah Hijau Lestari',
    address: 'Jl. Melati Raya No. 45',
    city: 'Jakarta Pusat',
    openHours: 'Setiap hari, 07.00–18.00',
    latitude: -6.1862,
    longitude: 106.8341,
  },
  {
    id: 'wb-003',
    name: 'Waste Sort AI Drop Center Sudirman',
    address: 'Jl. Jenderal Sudirman Kav. 52-53',
    city: 'Jakarta Selatan',
    openHours: 'Senin–Jumat, 09.00–20.00',
    latitude: -6.2241,
    longitude: 106.8094,
  },
  {
    id: 'wb-004',
    name: 'Bank Sampah Bersih Bersama',
    address: 'Jl. Pahlawan No. 8',
    city: 'Jakarta Timur',
    openHours: 'Senin–Sabtu, 08.00–16.00',
    latitude: -6.2250,
    longitude: 106.9004,
  },
];

@Injectable()
export class WasteBankService {
  findAll() {
    return { message: 'Berhasil', data: WASTE_BANKS };
  }
}
