#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#include <UniversalTelegramBot.h>
#include <Servo.h>
#include <SoftwareSerial.h>
#include <DFRobotDFPlayerMini.h>

// ================================================================
// ISI SEBELUM UPLOAD
// ================================================================
const char* WIFI_SSID = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";
const char* BOT_TOKEN = "ISI_TOKEN_BOT_TELEGRAM";
const char* CHAT_ID = "ISI_CHAT_ID_TELEGRAM";

// ================================================================
// PIN NODEMCU ESP8266
// ================================================================
constexpr uint8_t PIN_SERVO = D6;

// Pengertian dari sisi DFPlayer:
// TX DFPlayer -> D1 (RX ESP8266)
// RX DFPlayer <- D2 (TX ESP8266) melalui resistor 1 kOhm
constexpr uint8_t DFPLAYER_RX_ESP = D1;
constexpr uint8_t DFPLAYER_TX_ESP = D2;

// Satu HC-SR04 untuk mendeteksi orang.
constexpr uint8_t TRIG_ORANG = D7;
constexpr uint8_t ECHO_ORANG = D5;

constexpr float BATAS_ORANG_CM = 50.0;
constexpr float BATAS_HISTERESIS_CM = 60.0;
constexpr int SUDUT_TUTUP = 90;
constexpr int SUDUT_BUKA = 150;  // bergerak 60 derajat
constexpr uint8_t VOLUME_DFPLAYER = 22;

constexpr unsigned long JEDA_TUTUP_MS = 2000;
constexpr unsigned long INTERVAL_SENSOR_MS = 300;
constexpr unsigned long INTERVAL_WIFI_MS = 10000;

Servo servoTutup;
SoftwareSerial dfSerial(DFPLAYER_RX_ESP, DFPLAYER_TX_ESP);
DFRobotDFPlayerMini dfPlayer;
BearSSL::WiFiClientSecure secureClient;
UniversalTelegramBot bot(BOT_TOKEN, secureClient);

bool dfPlayerSiap = false;
bool dfPlayerTanpaBalasan = false;
bool siklusOrangAktif = false;
bool wifiSebelumnyaTerhubung = false;

float jarakOrang = -1;
unsigned long terakhirOrangTerlihat = 0;
unsigned long sensorTerakhir = 0;
unsigned long wifiTerakhir = 0;

float bacaUltrasonik() {
  digitalWrite(TRIG_ORANG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_ORANG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_ORANG, LOW);

  unsigned long durasi = pulseIn(ECHO_ORANG, HIGH, 25000UL);
  if (durasi == 0) return -1;

  float jarak = durasi * 0.0343f / 2.0f;
  if (jarak < 2.0f || jarak > 400.0f) return -1;
  return jarak;
}

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
  }

  if (!wifiTerhubung && wifiSebelumnyaTerhubung) {
    Serial.println("Wi-Fi terputus; sensor tetap berjalan.");
  }

  wifiSebelumnyaTerhubung = wifiTerhubung;
}

void putarSuara(uint8_t nomor) {
  if (!dfPlayerSiap) {
    Serial.println("DFPlayer belum siap; suara tidak diputar.");
    return;
  }

  Serial.print("Memutar /mp3/000");
  Serial.print(nomor);
  Serial.println(".mp3");
  dfPlayer.playMp3Folder(nomor);
}

void bukaTutup() {
  servoTutup.write(SUDUT_BUKA);
  putarSuara(1);
  Serial.println("Orang terdeteksi: servo dibuka ke 150 derajat.");
  kirimTelegram("orang terdeteksi, tempat sampah terbuka");
}

void tutupKembali() {
  servoTutup.write(SUDUT_TUTUP);
  putarSuara(2);
  Serial.println("Orang menjauh: servo ditutup ke 90 derajat.");
  kirimTelegram("selesai membuang, tempat sampah tertutup");
}

void prosesSensorOrang(unsigned long sekarang) {
  bool jarakValid = jarakOrang > 0;
  bool orangDekat = jarakValid && jarakOrang < BATAS_ORANG_CM;

  if (orangDekat) {
    terakhirOrangTerlihat = sekarang;

    if (!siklusOrangAktif) {
      siklusOrangAktif = true;
      bukaTutup();
    }
    return;
  }

  // Area 50-60 cm menjaga tutup tetap terbuka agar tidak bergetar
  // saat pembacaan berada tepat di sekitar batas 50 cm.
  if (siklusOrangAktif &&
      jarakValid && jarakOrang < BATAS_HISTERESIS_CM) {
    terakhirOrangTerlihat = sekarang;
    return;
  }

  if (siklusOrangAktif &&
      sekarang - terakhirOrangTerlihat >= JEDA_TUTUP_MS) {
    siklusOrangAktif = false;
    tutupKembali();
  }
}

void prosesPerintahSerial() {
  if (!Serial.available()) return;

  char perintah = Serial.read();
  if (perintah >= 'a' && perintah <= 'z') perintah -= 32;

  switch (perintah) {
    case 'O':
      servoTutup.write(SUDUT_BUKA);
      Serial.println("Tes manual: servo dibuka.");
      break;
    case 'C':
      servoTutup.write(SUDUT_TUTUP);
      Serial.println("Tes manual: servo ditutup.");
      break;
    case '1':
    case '2':
    case '3':
      putarSuara(perintah - '0');
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("=== TES ULTRASONIK + SERVO + DFPLAYER + TELEGRAM ===");

  pinMode(TRIG_ORANG, OUTPUT);
  pinMode(ECHO_ORANG, INPUT);
  digitalWrite(TRIG_ORANG, LOW);

  servoTutup.attach(PIN_SERVO, 500, 2400);
  servoTutup.write(SUDUT_TUTUP);
  Serial.println("Servo siap di D6, posisi awal 90 derajat.");

  dfSerial.begin(9600);
  delay(1000);

  if (dfPlayer.begin(dfSerial, true, true)) {
    dfPlayerSiap = true;
    Serial.println("DFPlayer terdeteksi dengan komunikasi normal.");
  } else {
    Serial.println("DFPlayer tidak membalas; mencoba mode tanpa ACK.");
    dfPlayer.begin(dfSerial, false, false);
    dfPlayerSiap = true;
    dfPlayerTanpaBalasan = true;
    Serial.println("Mode tanpa ACK aktif. Dengarkan apakah audio diputar.");
  }

  dfPlayer.volume(VOLUME_DFPLAYER);

  secureClient.setInsecure();
  mulaiWiFi();

  Serial.println("Menunggu orang pada jarak kurang dari 50 cm...");
  Serial.println("Perintah manual: O=buka, C=tutup, 1/2/3=putar suara.");
}

void loop() {
  unsigned long sekarang = millis();

  prosesWiFi(sekarang);
  prosesPerintahSerial();

  if (sekarang - sensorTerakhir >= INTERVAL_SENSOR_MS) {
    sensorTerakhir = sekarang;
    jarakOrang = bacaUltrasonik();

    Serial.print("Jarak orang: ");
    Serial.print(jarakOrang, 1);
    Serial.println(" cm");

    prosesSensorOrang(sekarang);
  }

  if (dfPlayerSiap && !dfPlayerTanpaBalasan && dfPlayer.available()) {
    uint8_t tipe = dfPlayer.readType();
    int nilai = dfPlayer.read();
    Serial.print("Status DFPlayer: tipe=");
    Serial.print(tipe);
    Serial.print(", nilai=");
    Serial.println(nilai);
  }

  delay(10);
}
