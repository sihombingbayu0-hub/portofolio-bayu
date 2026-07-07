# Tempat Sampah IoT NodeMCU ESP8266

## Fungsi

- Ultrasonik 1 membuka tutup saat orang berjarak kurang dari 50 cm.
- DFPlayer memutar suara 1 saat orang datang, suara 2 setelah selesai, dan suara 3 saat penuh.
- Ultrasonik 2 menyatakan penuh jika jarak sampah sekitar 4 cm.
- ESP8266 mengirim data sensor ke Firebase Realtime Database pada path `smartbin`.
- Aplikasi HP dapat mengubah `smartbin/tutupTerbuka` untuk membuka atau menutup servo.
- Aplikasi HP juga mengirim perintah servo lewat `smartbin/perintahTutup` agar perintah tidak tertimpa data sensor.
- Aplikasi HP dapat mengubah `smartbin/perintahSuara` menjadi `1`, `2`, atau `3` untuk memutar DFPlayer Mini.
- Aplikasi HP membaca data Firebase secara realtime untuk menampilkan status tempat sampah.
- Sistem lokal tetap bekerja saat internet mati, lalu data dikirim lagi ketika Wi-Fi kembali tersambung.

## Foto Prototype

| Tampak depan terbuka | Tampak belakang rangkaian |
|---|---|
| <img src="assets/foto/prototype-depan-terbuka.jpeg" width="320" alt="Prototype tempat sampah tampak depan dengan tutup terbuka"> | <img src="assets/foto/prototype-belakang-rangkaian.png" width="320" alt="Prototype tempat sampah tampak belakang dengan rangkaian NodeMCU"> |

| Sensor pada tutup | Tampak depan tertutup |
|---|---|
| <img src="assets/foto/prototype-sensor-tutup.png" width="320" alt="Sensor ultrasonik pada bagian tutup tempat sampah"> | <img src="assets/foto/prototype-depan-tertutup.png" width="320" alt="Prototype tempat sampah tampak depan dengan tutup tertutup"> |

| Rangkaian servo |
|---|
| <img src="assets/foto/rangkaian-servo.png" width="320" alt="Rangkaian servo pembuka tutup tempat sampah"> |

## Wiring

| Perangkat | Pin perangkat | NodeMCU ESP8266 |
|---|---|---|
| Ultrasonik 1 | TRIG | D7 |
| Ultrasonik 1 | ECHO | D5 melalui pembagi tegangan |
| Ultrasonik 2 | TRIG | D0 |
| Ultrasonik 2 | ECHO | D8 melalui pembagi tegangan |
| Servo | Signal | D6 |
| DFPlayer Mini | TX | D2 |
| DFPlayer Mini | RX | D1 melalui resistor 1 kOhm |

Kabel serial disilang: TX DFPlayer menuju D2 (RX ESP8266), sedangkan RX DFPlayer menerima dari D1 (TX ESP8266).

> D8/GPIO15 adalah pin boot dan harus LOW saat ESP8266 menyala. Jika board gagal boot atau gagal di-upload, lepaskan sementara kabel ECHO ultrasonik 2 dari D8. Pasang kembali setelah upload, lalu restart.

Kedua pin ECHO HC-SR04 menghasilkan 5 V. Gunakan pembagi tegangan, misalnya 1 kOhm dan 2 kOhm, agar sinyal menjadi sekitar 3,3 V.

Kalibrasi kapasitas sampah pada sketch memakai jarak kosong 16 cm dan jarak penuh 4 cm. Jika ukuran tempat sampah berubah, sesuaikan `JARAK_SAMPAH_KOSONG_CM` dan `BATAS_PENUH_CM`.

## Adaptor 5 V

- Positif adaptor 5 V menuju VCC servo, VCC DFPlayer, dan VCC kedua HC-SR04.
- Negatif adaptor menuju GND servo, DFPlayer, HC-SR04, dan GND ESP8266. Semua GND wajib disatukan.
- ESP8266 dapat diberi daya dari adaptor 5 V melalui pin `VIN`/`VU` yang sesuai dengan board, atau melalui kabel USB 5 V. Jangan memasukkan 5 V ke pin `3V3`.
- Gunakan adaptor minimal 5 V 2 A agar tegangan tidak turun saat servo bergerak dan DFPlayer berbunyi.
- Tambahkan kapasitor elektrolit 470-1000 uF di jalur 5 V dekat servo untuk membantu mencegah ESP8266 restart saat servo mulai bergerak.

Servo bergerak perlahan dari 165 derajat saat tertutup ke 75 derajat saat terbuka. Jika ingin lebih lambat, naikkan nilai `JEDA_SERVO_PER_DERAJAT_MS` pada sketch. Jika arah mekaniknya terbalik, tukar nilai `SUDUT_TUTUP` dan `SUDUT_BUKA`.

## File suara

Format microSD sebagai FAT32 dan buat folder `mp3`:

```text
/mp3/0001.mp3  -> suara saat ada orang
/mp3/0002.mp3  -> suara saat selesai membuang
/mp3/0003.mp3  -> suara saat penuh
```

Jika audio lebih panjang dari 3,5 detik, naikkan `JEDA_SUARA_MS` pada sketch.

Saat ESP8266 menyala, sketch akan mencoba tes `0001.mp3` jika `TES_SUARA_SAAT_NYALA` bernilai `true`. Jika Serial Monitor menampilkan `DFPlayer siap` dan `DFPlayer: memutar /mp3/0001.mp3` tetapi speaker tetap diam, periksa speaker, volume, microSD FAT32, nama folder `mp3`, dan nama file `0001.mp3`. Jika Serial Monitor menampilkan `DFPlayer tidak terdeteksi`, periksa ulang kabel TX/RX, VCC 5 V, dan GND bersama.

## Library Arduino IDE

Pilih board `NodeMCU 1.0 (ESP-12E Module)`, kemudian instal:

- `ArduinoJson`
- `DFRobotDFPlayerMini`

Library `ESP8266WiFi`, `ESP8266HTTPClient`, `Servo`, dan `SoftwareSerial` tersedia bersama paket board ESP8266.

Isi data Wi-Fi dan Firebase langsung di bagian atas file `iot_tempat_sampah/iot_tempat_sampah.ino`, lalu upload ke ESP8266. Serial Monitor menggunakan 115200 baud.

## Firebase Realtime Database

Gunakan struktur data berikut:

```json
{
  "smartbin": {
    "kapasitas": 0,
    "jarakOrang": 35,
    "jarakSampah": 16,
    "statusSampah": "Kosong",
    "tutupTerbuka": false,
    "perintahTutup": null,
    "suaraAktif": true,
    "perintahSuara": 0,
    "statusSuara": "Siap"
  }
}
```

Path yang dikirim ESP8266:

- `smartbin/kapasitas`
- `smartbin/jarakOrang`
- `smartbin/jarakSampah`
- `smartbin/statusSampah`
- `smartbin/tutupTerbuka`
- `smartbin/suaraAktif`
- `smartbin/statusSuara`

Path yang dibaca ESP8266 dari aplikasi HP:

- `smartbin/tutupTerbuka`
- `smartbin/perintahTutup`
- `smartbin/suaraAktif`
- `smartbin/perintahSuara`

Untuk uji coba awal, rules Realtime Database dapat dibuat terbuka sementara:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Setelah proyek berjalan, rules harus diamankan kembali.
