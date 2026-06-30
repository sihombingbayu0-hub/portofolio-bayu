# Dua Ultrasonik, DFPlayer Mini, Servo, dan Telegram

## Wiring

| Komponen | Pin | NodeMCU/catu daya |
|---|---|---|
| HC-SR04 | TRIG | D7 |
| HC-SR04 | ECHO | D5 melalui pembagi tegangan |
| HC-SR04 | VCC | 5 V adaptor |
| HC-SR04 | GND | GND bersama |
| HC-SR04 kapasitas | TRIG | D0 |
| HC-SR04 kapasitas | ECHO | D8 melalui pembagi tegangan |
| HC-SR04 kapasitas | VCC | 5 V adaptor |
| HC-SR04 kapasitas | GND | GND bersama |
| Servo | Signal | D6 |
| Servo | VCC | 5 V adaptor |
| Servo | GND | GND bersama |
| DFPlayer | TX | D1 |
| DFPlayer | RX | D2 melalui resistor 1 kOhm |
| DFPlayer | VCC | 5 V adaptor |
| DFPlayer | GND | GND bersama |

Gunakan pembagi tegangan yang sama pada kedua pin ECHO:

```text
ECHO HC-SR04 -- 1 kOhm --+-- D5 atau D8
                         |
                       2 kOhm
                         |
                        GND
```

`D8/GPIO15` adalah pin boot dan harus LOW ketika ESP8266 menyala. ECHO HC-SR04 normalnya LOW sebelum dipicu. Jika ESP8266 gagal boot, lepaskan sementara kabel ECHO dari D8, nyalakan board, lalu periksa kembali rangkaiannya.

Negatif adaptor, GND ESP8266, GND sensor, GND servo, dan GND DFPlayer wajib disatukan. Gunakan adaptor 5 V minimal 2 A dan kapasitor 470-1000 uF dekat servo/DFPlayer.

## MicroSD

Format FAT32 dan buat:

```text
/mp3/0001.mp3  -> suara saat objek/orang terdeteksi
/mp3/0002.mp3  -> suara saat selesai/orang menjauh
/mp3/0003.mp3  -> suara saat tempat sampah penuh
```

## Cara kerja

- Saat Wi-Fi tersambung, Telegram mengirim `sistem aktif`.
- Jarak kurang dari 50 cm: suara 1 langsung diputar dan servo bergerak perlahan dari 120 ke 50 derajat.
- Telegram mengirim `orang terdeteksi, tempat sampah terbuka`.
- Servo tetap terbuka selama orang masih berjarak kurang dari 50 cm.
- Setelah orang menjauh lebih dari 50 cm selama 2 detik, suara 2 langsung diputar dan servo kembali perlahan ke 120 derajat.
- Jika sampah penuh (kurang dari 10 cm), servo dikunci tertutup pada 120 derajat dan sensor orang tidak dapat membukanya.
- Selama masih penuh, suara 3 hanya diputar satu kali ketika orang mendekat kurang dari 50 cm. Suara tidak berulang selama orang tersebut masih berada di depan sensor.
- Telegram mengirim `selesai membuang, tempat sampah tertutup`.
- Sensor kapasitas membaca penuh setelah tiga pembacaan berturut-turut kurang dari 10 cm.
- Saat penuh, suara 3 langsung diputar tanpa antrean dan Telegram mengirim `tempat sampah penuh silahkan kosongkan`.
- Setelah jarak kapasitas lebih dari 15 cm sebanyak tiga pembacaan, Telegram mengirim `tempat sampah kosong siap di gunakan kembali`.
- Serial Monitor menggunakan 115200 baud.
- Perintah manual: `O` buka, `C` tutup, dan `1`/`2`/`3` memutar suara.

## Pengaturan Telegram

1. Salin `test_ultrasonik_dfplayer_servo/secrets.example.h` menjadi `test_ultrasonik_dfplayer_servo/secrets.h`.
2. Isi data Wi-Fi, `BOT_TOKEN` dari BotFather, dan `CHAT_ID` Telegram di file `secrets.h`.
3. Instal library `UniversalTelegramBot`, `ArduinoJson`, dan `DFRobotDFPlayerMini`.
