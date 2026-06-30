# Tes DFPlayer Mini pada ESP8266

Lepaskan dahulu servo dan kedua sensor ultrasonik. Tes hanya menggunakan ESP8266, DFPlayer Mini, speaker, microSD, serta adaptor 5 V.

## Wiring

| DFPlayer Mini | NodeMCU ESP8266 / catu daya |
|---|---|
| VCC | Positif adaptor 5 V |
| GND | Negatif adaptor dan GND ESP8266 |
| TX | D4 |
| RX | D3 melalui resistor 1 kOhm |
| SPK1 | Kabel speaker pertama |
| SPK2 | Kabel speaker kedua |

Semua GND wajib disatukan. Jangan menghubungkan kedua kabel speaker ke GND; speaker dipasang di antara `SPK1` dan `SPK2`.

> D3 dan D4 adalah pin boot ESP8266. Jika upload atau boot gagal, lepaskan sementara kabel D3/D4 dari DFPlayer, upload sketch, kemudian pasang kembali dan tekan tombol reset.

## MicroSD

Format microSD sebagai FAT32. Buat folder bernama `mp3` pada root kartu, kemudian beri nama file tepat seperti berikut:

```text
/mp3/0001.mp3
/mp3/0002.mp3
/mp3/0003.mp3
```

## Pengujian

1. Pilih board `NodeMCU 1.0 (ESP-12E Module)`.
2. Instal library `DFRobotDFPlayerMini`.
3. Upload sketch dan buka Serial Monitor pada 115200 baud.
4. Setelah muncul `DFPlayer TERDETEKSI`, ketiga track diputar otomatis dengan jeda 7 detik.
5. Untuk mengulang manual, ketik `1`, `2`, atau `3` di Serial Monitor lalu tekan Send.

Jika muncul `DFPlayer TIDAK TERDETEKSI`, periksa suplai 5 V, GND bersama, silang TX/RX, resistor seri 1 kOhm menuju RX DFPlayer, dan format microSD.
