# Tes Satu Ultrasonik HC-SR04

Lepaskan servo, DFPlayer, dan sensor ultrasonik lainnya. Tes hanya menggunakan NodeMCU ESP8266 dan satu HC-SR04.

## Wiring

```text
HC-SR04 VCC  -> positif adaptor 5 V
HC-SR04 GND  -> GND adaptor dan GND ESP8266
HC-SR04 TRIG -> D7
HC-SR04 ECHO -> resistor 1 kOhm -> titik D5
                                         |
                                    resistor 2 kOhm
                                         |
                                        GND
```

Jangan menghubungkan ECHO 5 V langsung ke ESP8266. Semua GND wajib disatukan.

## Pengujian

1. Pilih board `NodeMCU 1.0 (ESP-12E Module)`.
2. Upload sketch.
3. Buka Serial Monitor pada 115200 baud.
4. Hadapkan sensor ke benda datar pada jarak sekitar 20-100 cm.
5. Saat benda kurang dari 50 cm, status berubah menjadi `TERDETEKSI`.

Jika muncul `GAGAL MEMBACA (-1)`, ukur tegangan VCC-GND sensor (seharusnya sekitar 5 V), periksa GND bersama, dan pastikan TRIG/ECHO tidak tertukar.
