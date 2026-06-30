#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#include <UniversalTelegramBot.h>
#include <Servo.h>
#include <SoftwareSerial.h>
#include <DFRobotDFPlayerMini.h>

// Isi sebelum upload.
const char* WIFI_SSID = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";
const char* BOT_TOKEN = "ISI_TOKEN_BOT_TELEGRAM";
const char* CHAT_ID = "ISI_CHAT_ID_TELEGRAM";

// ================================================================
// PIN NODEMCU ESP8266
// ================================================================
constexpr uint8_t TRIG_ORANG = D7;
constexpr uint8_t ECHO_ORANG = D5;
constexpr uint8_t TRIG_SAMPAH = D0;
constexpr uint8_t ECHO_SAMPAH = D8;
constexpr uint8_t PIN_SERVO = D6;

// TX DFPlayer -> D1 (RX ESP8266)
// RX DFPlayer <- D2 (TX ESP8266) melalui resistor 1 kOhm
constexpr uint8_t DFPLAYER_RX_ESP = D1;

constexpr uint8_t DFPLAYER_TX_ESP = D2;

constexpr float BATAS_ORANG_CM = 50.0;
constexpr float BATAS_PENUH_CM = 4.0;
constexpr float RESET_PENUH_CM = 10.0;
constexpr uint8_t KONFIRMASI_PENUH = 6;
constexpr uint8_t KONFIRMASI_KOSONG = 6;

// Kalibrasi servo: bergerak 70 derajat tanpa mendekati batas 0/180.
constexpr int SUDUT_TUTUP = 165;
constexpr int SUDUT_BUKA = 75;
constexpr uint8_t JEDA_GERAK_SERVO_MS = 15;

constexpr uint8_t VOLUME_DFPLAYER = 22;  // rentang 0-30
constexpr unsigned long JEDA_TUTUP_MS = 2000;
constexpr unsigned long INTERVAL_SENSOR_MS = 150;
constexpr unsigned long INTERVAL_WIFI_MS = 10000;

Servo servoTutup;
SoftwareSerial dfSerial(DFPLAYER_RX_ESP, DFPLAYER_TX_ESP);
DFRobotDFPlayerMini dfPlayer;
BearSSL::WiFiClientSecure secureClient;
UniversalTelegramBot bot(BOT_TOKEN, secureClient);

bool dfPlayerSiap = false;
bool dfPlayerTanpaACK = false;
bool tutupTerbuka = false;
bool statusPenuh = false;
bool wifiSebelumnyaTerhubung = false;
bool peringatanPenuhSudahDiputar = false;
int posisiServo = SUDUT_TUTUP;

float jarakOrang = -1;
float jarakSampah = -1;
uint8_t hitungPenuh = 0;
uint8_t hitungKosong = 0;
unsigned long terakhirOrangTerlihat = 0;
unsigned long sensorTerakhir = 0;
unsigned long wifiTerakhir = 0;

bool kirimTelegram(const String& pesan) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Telegram belum dikirim: Wi-Fi belum terhubung.");
    return false;
  }

  bool terkirim = bot.sendMessage(CHAT_ID, pesan, "");
  Serial.println(terkirim ? "Telegram: pesan terkirim."
                          : "Telegram: pesan gagal dikirim.");
  return terkirim;
}

void mulaiWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println("Mencoba menghubungkan Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void prosesWiFi(unsigned long sekarang) {
  bool wifiTerhubung = WiFi.status() == WL_CONNECTED;

  if (!wifiTerhubung && sekarang - wifiTerakhir >= INTERVAL_WIFI_MS) {
    wifiTerakhir = sekarang;
    mulaiWiFi();
  }

  if (wifiTerhubung && !wifiSebelumnyaTerhubung) {
    Serial.print("Wi-Fi terhubung. IP: ");
    Serial.println(WiFi.localIP());
    kirimTelegram("sistem aktif");
    delay(500);
    kirimTelegram("tempat sampah kosong siap di gunakan");
  }

  if (!wifiTerhubung && wifiSebelumnyaTerhubung) {
    Serial.println("Wi-Fi terputus; sistem lokal tetap berjalan.");
  }

  wifiSebelumnyaTerhubung = wifiTerhubung;
}

float bacaJarakCm(uint8_t trigPin, uint8_t echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  unsigned long durasi = pulseIn(echoPin, HIGH, 30000UL);
  if (durasi == 0) return -1;

  float jarak = durasi * 0.0343f / 2.0f;
  if (jarak < 2.0f || jarak > 400.0f) return -1;
  return jarak;
}

float bacaJarakStabilCm(uint8_t trigPin, uint8_t echoPin) {
  float data[5];
  uint8_t jumlahValid = 0;

  for (uint8_t i = 0; i < 5; i++) {
    float jarak = bacaJarakCm(trigPin, echoPin);
    if (jarak > 0) {
      data[jumlahValid] = jarak;
      jumlahValid++;
    }
    delay(25);
    yield();
  }

  if (jumlahValid == 0) return -1;

  for (uint8_t i = 0; i < jumlahValid - 1; i++) {
    for (uint8_t j = i + 1; j < jumlahValid; j++) {
      if (data[j] < data[i]) {
        float sementara = data[i];
        data[i] = data[j];
        data[j] = sementara;
      }
    }
  }

  return data[jumlahValid / 2];
}

void putarSuaraSekarang(uint8_t nomor) {
  if (!dfPlayerSiap) {
    Serial.println("DFPlayer belum siap.");
    return;
  }

  Serial.print("Memutar /mp3/000");
  Serial.print(nomor);
  Serial.println(".mp3");
  dfPlayer.playMp3Folder(nomor);
}

void gerakkanServoPerlahan(int sudutTujuan) {
  sudutTujuan = constrain(sudutTujuan, 10, 170);

  if (posisiServo < sudutTujuan) {
    for (int sudut = posisiServo; sudut <= sudutTujuan; sudut++) {
      servoTutup.write(sudut);
      delay(JEDA_GERAK_SERVO_MS);
      yield();
    }
  } else {
    for (int sudut = posisiServo; sudut >= sudutTujuan; sudut--) {
      servoTutup.write(sudut);
      delay(JEDA_GERAK_SERVO_MS);
      yield();
    }
  }

  posisiServo = sudutTujuan;
}

void bukaTempatSampah() {
  if (statusPenuh) {
    Serial.println("Tempat sampah penuh: perintah membuka diabaikan.");
    return;
  }

  if (tutupTerbuka) return;

  tutupTerbuka = true;
  putarSuaraSekarang(1);
  gerakkanServoPerlahan(SUDUT_BUKA);
  Serial.println("Orang <50 cm: tempat sampah terbuka.");
}

void tutupTempatSampah() {
  if (!tutupTerbuka) return;

  tutupTerbuka = false;
  putarSuaraSekarang(2);
  gerakkanServoPerlahan(SUDUT_TUTUP);
  Serial.println("Orang >50 cm: tempat sampah tertutup.");
}

void prosesKapasitasSampah() {
  if (jarakSampah <= 0) {
    hitungPenuh = 0;
    hitungKosong = 0;
    return;
  }

  if (!statusPenuh) {
    hitungKosong = 0;

    if (jarakSampah < BATAS_PENUH_CM) {
      if (hitungPenuh < KONFIRMASI_PENUH) hitungPenuh++;
    } else {
      hitungPenuh = 0;
    }

    if (hitungPenuh >= KONFIRMASI_PENUH) {
      statusPenuh = true;
      hitungPenuh = 0;
      peringatanPenuhSudahDiputar = false;

      // Saat penuh, tutup langsung dikunci tanpa memutar suara selesai membuang.
      if (tutupTerbuka || posisiServo != SUDUT_TUTUP) {
        tutupTerbuka = false;
        gerakkanServoPerlahan(SUDUT_TUTUP);
      }
      Serial.println("TEMPAT SAMPAH PENUH (<4 cm).");
      kirimTelegram("tempat sampah penuh silahkan di kosongkan");
    }
    return;
  }

  hitungPenuh = 0;
  if (jarakSampah > RESET_PENUH_CM) {
    if (hitungKosong < KONFIRMASI_KOSONG) hitungKosong++;
  } else {
    hitungKosong = 0;
  }

  if (hitungKosong >= KONFIRMASI_KOSONG) {
    statusPenuh = false;
    hitungKosong = 0;
    peringatanPenuhSudahDiputar = false;
    Serial.println("Tempat sampah kosong (>10 cm): siap digunakan kembali.");
    kirimTelegram("tempat sampah kosong siap di gunakan");
  }
}

void prosesSensor(unsigned long sekarang) {
  // Sensor orang tidak boleh membuka tutup selama status penuh.
  if (statusPenuh) {
    if (tutupTerbuka || posisiServo != SUDUT_TUTUP) {
      tutupTerbuka = false;
      gerakkanServoPerlahan(SUDUT_TUTUP);
    }

    // Peringatan hanya sekali untuk setiap orang yang mendekat.
    if (jarakOrang > 0 && jarakOrang < BATAS_ORANG_CM) {
      if (!peringatanPenuhSudahDiputar) {
        putarSuaraSekarang(3);
        peringatanPenuhSudahDiputar = true;
        Serial.println("Orang mendekat, tetapi tempat sampah penuh.");
      }
    } else {
      peringatanPenuhSudahDiputar = false;
    }
    return;
  }

  bool jarakValid = jarakOrang > 0;

  if (jarakValid && jarakOrang < BATAS_ORANG_CM) {
    terakhirOrangTerlihat = sekarang;
    bukaTempatSampah();
    return;
  }

  // Servo baru menutup jika orang sudah tidak berada di area <50 cm
  // selama JEDA_TUTUP_MS. Jeda mencegah gerakan berulang akibat noise.
  if (tutupTerbuka &&
      sekarang - terakhirOrangTerlihat >= JEDA_TUTUP_MS) {
    tutupTempatSampah();
  }
}

void prosesPerintahSerial() {
  if (!Serial.available()) return;

  char perintah = Serial.read();
  if (perintah >= 'a' && perintah <= 'z') perintah -= 32;

  switch (perintah) {
    case 'O':
      if (statusPenuh) {
        Serial.println("Tes manual ditolak: tempat sampah masih penuh.");
      } else {
        gerakkanServoPerlahan(SUDUT_BUKA);
        tutupTerbuka = true;
        Serial.println("Tes manual: servo dibuka.");
      }
      break;
    case 'C':
      gerakkanServoPerlahan(SUDUT_TUTUP);
      tutupTerbuka = false;
      Serial.println("Tes manual: servo ditutup.");
      break;
    case '1':
    case '2':
    case '3':
      putarSuaraSekarang(perintah - '0');
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("=== 2 ULTRASONIK + DFPLAYER + SERVO + TELEGRAM ===");

  pinMode(TRIG_ORANG, OUTPUT);
  pinMode(ECHO_ORANG, INPUT);
  pinMode(TRIG_SAMPAH, OUTPUT);
  pinMode(ECHO_SAMPAH, INPUT);
  digitalWrite(TRIG_ORANG, LOW);
  digitalWrite(TRIG_SAMPAH, LOW);

  servoTutup.attach(PIN_SERVO, 500, 2400);
  servoTutup.write(SUDUT_TUTUP);
  posisiServo = SUDUT_TUTUP;
  delay(500);
  Serial.println("Servo siap di D6, posisi tertutup 120 derajat.");

  dfSerial.begin(9600);
  delay(1000);

  if (dfPlayer.begin(dfSerial, true, true)) {
    dfPlayerSiap = true;
    Serial.println("DFPlayer terdeteksi.");
  } else {
    // Beberapa modul clone menerima perintah tetapi tidak mengirim ACK.
    Serial.println("DFPlayer tidak membalas; mencoba mode tanpa ACK.");
    dfPlayer.begin(dfSerial, false, false);
    dfPlayerSiap = true;
    dfPlayerTanpaACK = true;
  }

  dfPlayer.volume(VOLUME_DFPLAYER);

  secureClient.setInsecure();
  mulaiWiFi();

  Serial.println("Menunggu objek pada jarak kurang dari 50 cm...");
  Serial.println("Manual: O=buka, C=tutup, 1/2/3=putar suara.");
}

void loop() {
  unsigned long sekarang = millis();
  prosesWiFi(sekarang);
  prosesPerintahSerial();

  if (sekarang - sensorTerakhir >= INTERVAL_SENSOR_MS) {
    sensorTerakhir = sekarang;
    jarakOrang = bacaJarakCm(TRIG_ORANG, ECHO_ORANG);

    // Respon sensor orang dibuat duluan supaya servo tidak menunggu
    // pembacaan sensor kapasitas sampah.
    prosesSensor(sekarang);

    delay(20);  // mencegah dua ultrasonik saling mengganggu
    jarakSampah = bacaJarakStabilCm(TRIG_SAMPAH, ECHO_SAMPAH);

    prosesKapasitasSampah();

    // Jika setelah membaca kapasitas ternyata penuh, kunci tutup saat itu juga.
    if (statusPenuh) {
      prosesSensor(sekarang);
    }

    Serial.print("Orang: ");
    if (jarakOrang < 0) {
      Serial.print("GAGAL");
    } else {
      Serial.print(jarakOrang, 1);
      Serial.print(" cm");
    }

    Serial.print(" | Sampah: ");
    if (jarakSampah < 0) {
      Serial.print("GAGAL");
    } else {
      Serial.print(jarakSampah, 1);
      Serial.print(" cm");
    }
    Serial.print(" | Penuh: ");
    Serial.print(statusPenuh ? "YA" : "TIDAK");
    Serial.print(" | Batas penuh: <");
    Serial.print(BATAS_PENUH_CM, 1);
    Serial.println(" cm");
  }

  if (dfPlayerSiap && !dfPlayerTanpaACK && dfPlayer.available()) {
    uint8_t tipe = dfPlayer.readType();
    int nilai = dfPlayer.read();
    Serial.print("Status DFPlayer: tipe=");
    Serial.print(tipe);
    Serial.print(", nilai=");
    Serial.println(nilai);
  }

  delay(10);
}
