# Tes Dua Ultrasonik dan Telegram

Sketch ini hanya menguji ESP8266, dua HC-SR04, dan Telegram. Lepaskan servo dan DFPlayer selama pengujian.

## Wiring

| Sensor | Pin | ESP8266 |
|---|---|---|
| Ultrasonik 1 | TRIG | D1 |
| Ultrasonik 1 | ECHO | D2 melalui pembagi tegangan |
| Ultrasonik 2 | TRIG | D7 |
| Ultrasonik 2 | ECHO | D5 melalui pembagi tegangan |

Pembagi tegangan masing-masing ECHO:

```text
ECHO HC-SR04 -- resistor 1 kOhm --+-- D2 atau D5
                                  |
                             resistor 2 kOhm
                                  |
                              GND bersama
```

VCC kedua HC-SR04 menuju 5 V. GND sensor, adaptor, dan ESP8266 wajib disatukan. Isolasi semua kaki resistor agar tidak menyentuh badan logam.

## Persiapan

1. Isi `WIFI_SSID` dan `WIFI_PASSWORD`.
2. Isi `BOT_TOKEN` dari BotFather dan `CHAT_ID` Telegram.
3. Instal library `UniversalTelegramBot` dan `ArduinoJson`.
4. Pilih board `NodeMCU 1.0 (ESP-12E Module)` dan upload.
5. Buka Serial Monitor pada 115200 baud.

## Hasil yang diharapkan

- Setelah Wi-Fi terhubung, Telegram menerima `sistem aktif`.
- Tangan kurang dari 50 cm di sensor 1 menampilkan `ORANG TERDETEKSI` di Serial Monitor.
- Benda kurang dari 10 cm di sensor 2 mengirim `tempat sampah penuh silahkan kosongkan` sekali.
- Setelah benda dijauhkan lebih dari 15 cm, Telegram mengirim `tempat sampah kosong siap di gunakan kembali`.
- Jika pembacaan tetap `-1.0 cm`, periksa daya, GND bersama, urutan TRIG/ECHO, dan pembagi tegangan.
