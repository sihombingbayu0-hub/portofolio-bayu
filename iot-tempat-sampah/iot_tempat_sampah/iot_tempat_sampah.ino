#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#include <UniversalTelegramBot.h>
#include <Servo.h>
#include <SoftwareSerial.h>
#include <DFRobotDFPlayerMini.h>

// Isi empat data berikut sebelum upload.
const char* WIFI_SSID     = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";
const char* BOT_TOKEN     = "ISI_TOKEN_BOT_TELEGRAM";
const char* CHAT_ID       = "ISI_CHAT_ID_TELEGRAM";

// Pemetaan pin NodeMCU ESP8266.
constexpr uint8_t TRIG_ORANG = D1;
constexpr uint8_t ECHO_ORANG = D2;
constexpr uint8_t TRIG_SAMPAH = D7;
constexpr uint8_t ECHO_SAMPAH = D5;
constexpr uint8_t PIN_SERVO = D6;

// SoftwareSerial berurutan (RX, TX):
// TX DFPlayer -> D4 dan RX DFPlayer <- D3 melalui resistor 1 kOhm.
constexpr uint8_t DFPLAYER_RX = D4;
constexpr uint8_t DFPLAYER_TX = D3;

constexpr float BATAS_ORANG_CM = 50.0;
constexpr float BATAS_PENUH_CM = 10.0;
constexpr float BATAS_KOSONG_KEMBALI_CM = 15.0;

constexpr int SUDUT_TUTUP = 90;
constexpr int SUDUT_BUKA = 180;
constexpr unsigned long JEDA_TUTUP_MS = 2000;
constexpr unsigned long INTERVAL_SENSOR_MS = 250;
constexpr unsigned long INTERVAL_WIFI_MS = 10000;
constexpr unsigned long JEDA_SUARA_MS = 3500;

// /mp3/0001.mp3 = ada orang
// /mp3/0002.mp3 = selesai membuang
// /mp3/0003.mp3 = tempat sampah penuh
constexpr uint8_t SUARA_ADA_ORANG = 1;
constexpr uint8_t SUARA_SELESAI = 2;
constexpr uint8_t SUARA_PENUH = 3;

BearSSL::WiFiClientSecure secureClient;
UniversalTelegramBot bot(BOT_TOKEN, secureClient);
Servo servoTutup;
SoftwareSerial dfSerial(DFPLAYER_RX, DFPLAYER_TX);
DFRobotDFPlayerMini dfPlayer;

bool dfPlayerSiap = false;
bool tutupTerbuka = false;
bool siklusBuangAktif = false;
bool statusPenuh = false;
bool wifiSebelumnyaTerhubung = false;
bool notifikasiPenuhTertunda = false;
bool notifikasiKosongTertunda = false;
bool suaraPernahDiputar = false;

unsigned long terakhirOrangTerlihat = 0;
unsigned long sensorTerakhir = 0;
unsigned long wifiTerakhir = 0;
unsigned long suaraTerakhir = 0;

float jarakOrang = -1;
float jarakSampah = -1;

constexpr uint8_t UKURAN_ANTRIAN_SUARA = 6;
uint8_t antrianSuara[UKURAN_ANTRIAN_SUARA];
uint8_t kepalaSuara = 0;
uint8_t ekorSuara = 0;
uint8_t jumlahSuara = 0;

float bacaUltrasonik(uint8_t trigPin, uint8_t echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  unsigned long durasi = pulseIn(echoPin, HIGH, 25000UL);
  if (durasi == 0) return -1;

  float jarak = durasi * 0.0343f / 2.0f;
  if (jarak < 2.0f || jarak > 400.0f) return -1;
  return jarak;
}

void antrekanSuara(uint8_t nomor) {
  if (!dfPlayerSiap || jumlahSuara >= UKURAN_ANTRIAN_SUARA) return;
  antrianSuara[ekorSuara] = nomor;
  ekorSuara = (ekorSuara + 1) % UKURAN_ANTRIAN_SUARA;
  jumlahSuara++;
}

void prosesAntrianSuara(unsigned long sekarang) {
  if (!dfPlayerSiap || jumlahSuara == 0) return;
  if (suaraPernahDiputar && sekarang - suaraTerakhir < JEDA_SUARA_MS) return;

  uint8_t nomor = antrianSuara[kepalaSuara];
  kepalaSuara = (kepalaSuara + 1) % UKURAN_ANTRIAN_SUARA;
  jumlahSuara--;
  dfPlayer.playMp3Folder(nomor);
  suaraTerakhir = sekarang;
  suaraPernahDiputar = true;
}

bool kirimTelegram(const String& pesan) {
  if (WiFi.status() != WL_CONNECTED) return false;
  bool terkirim = bot.sendMessage(CHAT_ID, pesan, "");
  Serial.println(terkirim ? "Telegram: pesan terkirim"
                          : "Telegram: pesan gagal dikirim");
  return terkirim;
}

void mulaiKoneksiWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Mencoba terhubung ke Wi-Fi %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void prosesStatusWiFi(unsigned long sekarang) {
  bool wifiTerhubung = WiFi.status() == WL_CONNECTED;

  if (!wifiTerhubung && sekarang - wifiTerakhir >= INTERVAL_WIFI_MS) {
    wifiTerakhir = sekarang;
    mulaiKoneksiWiFi();
  }

  // Dikirim saat pertama online maupun setelah tersambung kembali.
  if (wifiTerhubung && !wifiSebelumnyaTerhubung) {
    Serial.printf("Wi-Fi terhubung. IP: %s\n",
                  WiFi.localIP().toString().c_str());
    kirimTelegram("sistem aktif");

    if (notifikasiPenuhTertunda &&
        kirimTelegram("tempat sampah penuh silahkan kosongkan")) {
      notifikasiPenuhTertunda = false;
    }
    if (notifikasiKosongTertunda &&
        kirimTelegram("tempat sampah kosong siap di gunakan kembali")) {
      notifikasiKosongTertunda = false;
    }
  }

  if (!wifiTerhubung && wifiSebelumnyaTerhubung) {
    Serial.println("Wi-Fi terputus. Sistem lokal tetap berjalan.");
  }
  wifiSebelumnyaTerhubung = wifiTerhubung;
}

void prosesSensorOrang(unsigned long sekarang) {
  bool adaOrang = jarakOrang > 0 && jarakOrang < BATAS_ORANG_CM;

  if (adaOrang) {
    terakhirOrangTerlihat = sekarang;
    if (!siklusBuangAktif) {
      siklusBuangAktif = true;
      servoTutup.write(SUDUT_BUKA);
      tutupTerbuka = true;
      antrekanSuara(SUARA_ADA_ORANG);
      Serial.println("Orang terdeteksi, tutup dibuka.");
    }
    return;
  }

  if (siklusBuangAktif &&
      sekarang - terakhirOrangTerlihat >= JEDA_TUTUP_MS) {
    servoTutup.write(SUDUT_TUTUP);
    tutupTerbuka = false;
    siklusBuangAktif = false;
    antrekanSuara(SUARA_SELESAI);
    Serial.println("Selesai membuang, tutup ditutup.");
  }
}

void prosesKapasitasSampah() {
  if (jarakSampah <= 0) return;

  if (!statusPenuh && jarakSampah < BATAS_PENUH_CM) {
    statusPenuh = true;
    antrekanSuara(SUARA_PENUH);
    Serial.println("Tempat sampah penuh.");

    if (!kirimTelegram("tempat sampah penuh silahkan kosongkan")) {
      notifikasiPenuhTertunda = true;
    }
  }

  // Hysteresis mencegah pesan berulang ketika jarak berada dekat 10 cm.
  if (statusPenuh && jarakSampah > BATAS_KOSONG_KEMBALI_CM) {
    statusPenuh = false;
    notifikasiPenuhTertunda = false;
    Serial.println("Tempat sampah kosong dan siap digunakan kembali.");

    if (!kirimTelegram("tempat sampah kosong siap di gunakan kembali")) {
      notifikasiKosongTertunda = true;
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_ORANG, OUTPUT);
  pinMode(ECHO_ORANG, INPUT);
  pinMode(TRIG_SAMPAH, OUTPUT);
  pinMode(ECHO_SAMPAH, INPUT);

  servoTutup.attach(PIN_SERVO, 500, 2400);
  servoTutup.write(SUDUT_TUTUP);

  dfSerial.begin(9600);
  if (dfPlayer.begin(dfSerial, true, true)) {
    dfPlayerSiap = true;
    dfPlayer.volume(24);
    Serial.println("DFPlayer siap.");
  } else {
    Serial.println("DFPlayer tidak terdeteksi. Periksa kabel dan microSD.");
  }

  secureClient.setInsecure();
  mulaiKoneksiWiFi();
}

void loop() {
  unsigned long sekarang = millis();
  prosesStatusWiFi(sekarang);
  prosesAntrianSuara(sekarang);

  if (sekarang - sensorTerakhir >= INTERVAL_SENSOR_MS) {
    sensorTerakhir = sekarang;
    jarakOrang = bacaUltrasonik(TRIG_ORANG, ECHO_ORANG);
    delay(35);
    jarakSampah = bacaUltrasonik(TRIG_SAMPAH, ECHO_SAMPAH);

    Serial.printf("Orang: %.1f cm | Sampah: %.1f cm | Penuh: %s\n",
                  jarakOrang, jarakSampah, statusPenuh ? "YA" : "TIDAK");
    prosesSensorOrang(sekarang);
    prosesKapasitasSampah();
  }
  yield();
}
