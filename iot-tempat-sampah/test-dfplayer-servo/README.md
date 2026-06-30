# Tes Ultrasonik, DFPlayer Mini, Servo, dan Telegram

Tes ini menggunakan NodeMCU ESP8266, satu HC-SR04, DFPlayer Mini, speaker, microSD, servo, Wi-Fi, Telegram, dan adaptor 5 V.

## Wiring

| Komponen | Pin | Sambungan |
|---|---|---|
| Servo | Signal | D6 |
| Servo | VCC | Positif adaptor 5 V |
| Servo | GND | GND bersama |
| DFPlayer | VCC | Positif adaptor 5 V |
| DFPlayer | GND | GND bersama |
| DFPlayer | TX | D1 (RX ESP8266) |
| DFPlayer | RX | D2 (TX ESP8266) melalui resistor 1 kOhm |
| Speaker | Kabel 1 dan 2 | SPK1 dan SPK2 |
| HC-SR04 | TRIG | D7 |
| HC-SR04 | ECHO | D5 melalui pembagi tegangan |
| HC-SR04 | VCC | Positif adaptor 5 V |
| HC-SR04 | GND | GND bersama |

Negatif adaptor, GND servo, GND DFPlayer, dan GND ESP8266 harus disatukan. Gunakan adaptor 5 V minimal 2 A. Kapasitor 470-1000 uF dekat servo/DFPlayer disarankan untuk mencegah tegangan turun.

Gunakan pembagi tegangan pada ECHO: ECHO sensor menuju resistor 1 kOhm, lalu ke D5; dari titik D5 pasang resistor 2 kOhm menuju GND. Jangan memasukkan sinyal ECHO 5 V langsung ke ESP8266.

## MicroSD

Format FAT32 dan buat struktur berikut:

```text
/mp3/0001.mp3
/mp3/0002.mp3
/mp3/0003.mp3
```

Masukkan microSD sebelum menyalakan daya.

## Cara menguji

1. Salin `test_dfplayer_servo/secrets.example.h` menjadi `test_dfplayer_servo/secrets.h`, lalu isi data Wi-Fi dan Telegram di file `secrets.h`.
2. Instal `UniversalTelegramBot`, `ArduinoJson`, dan `DFRobotDFPlayerMini`.
3. Upload sketch dan buka Serial Monitor pada 115200 baud.
4. Telegram menerima `sistem aktif` ketika Wi-Fi tersambung.
5. Servo mulai di 90 derajat dan menunggu objek/orang.
6. Saat jarak kurang dari 50 cm, servo bergerak ke 150 derajat, suara 1 diputar, dan Telegram mengirim status.
7. Setelah objek menjauh lebih dari 60 cm selama 2 detik, servo kembali ke 90 derajat, suara 2 diputar, dan Telegram mengirim status.

Perintah manual melalui Serial Monitor:

```text
O = buka servo ke 150 derajat
C = tutup servo ke 90 derajat
1 = putar 0001.mp3
2 = putar 0002.mp3
3 = putar 0003.mp3
```

Jika muncul mode tanpa ACK tetapi suara tetap terdengar, DFPlayer merupakan clone yang dapat menerima perintah tetapi tidak mengirim balasan serial.
