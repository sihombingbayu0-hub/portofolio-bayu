#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <ArduinoJson.h>
#include <Servo.h>
#include <SoftwareSerial.h>
#include <DFRobotDFPlayerMini.h>

// ===================== KONFIGURASI WIFI DAN FIREBASE =====================
// Ganti nilai di bawah ini dengan data milik kamu sebelum upload ke ESP8266.
// Karena semua konfigurasi ada di file ini, sketch tidak perlu file tambahan.
static const char* WIFI_SSID = "ehe";
static const char* WIFI_PASSWORD = "pesandulu";

// Contoh URL:
// https://nama-project-default-rtdb.firebaseio.com
// https://nama-project-default-rtdb.asia-southeast1.firebasedatabase.app
static const char* FIREBASE_DATABASE_URL = "https://smart-bin-monitor-6f0e1-default-rtdb.firebaseio.com";

// Kosongkan jika rules Firebase masih terbuka untuk uji coba.
// Jika memakai token/database secret, isi token di sini.
static const char* FIREBASE_AUTH = "";
// ========================================================================

// Pemetaan pin NodeMCU ESP8266.
constexpr uint8_t TRIG_ORANG = D7;
constexpr uint8_t ECHO_ORANG = D5;
constexpr uint8_t TRIG_SAMPAH = D0;
constexpr uint8_t ECHO_SAMPAH = D8;
constexpr uint8_t PIN_SERVO = D6;

// SoftwareSerial berurutan (RX, TX):
// TX DFPlayer -> D2 dan RX DFPlayer <- D1 melalui resistor 1 kOhm.
constexpr uint8_t DFPLAYER_RX = D2;
constexpr uint8_t DFPLAYER_TX = D1;

constexpr float BATAS_ORANG_CM = 50.0;
constexpr float BATAS_PENUH_CM = 4.0;
constexpr float BATAS_KOSONG_KEMBALI_CM = 10.0;
constexpr float JARAK_SAMPAH_KOSONG_CM = 16.0;

constexpr int SUDUT_TUTUP = 165;
constexpr int SUDUT_BUKA = 75;
constexpr int JEDA_SERVO_PER_DERAJAT_MS = 25;
constexpr unsigned long JEDA_TUTUP_MS = 2000;
constexpr unsigned long INTERVAL_SENSOR_MS = 250;
constexpr unsigned long INTERVAL_WIFI_MS = 10000;
constexpr unsigned long INTERVAL_FIREBASE_BACA_MS = 800;
constexpr unsigned long INTERVAL_FIREBASE_KIRIM_MS = 2000;
constexpr unsigned long JEDA_SUARA_MS = 3500;

// /mp3/0001.mp3 = ada orang
// /mp3/0002.mp3 = selesai membuang
// /mp3/0003.mp3 = tempat sampah penuh
constexpr uint8_t SUARA_ADA_ORANG = 1;
constexpr uint8_t SUARA_SELESAI = 2;
constexpr uint8_t SUARA_PENUH = 3;
constexpr bool TES_SUARA_SAAT_NYALA = true;

BearSSL::WiFiClientSecure firebaseClient;
Servo servoTutup;
SoftwareSerial dfSerial(DFPLAYER_RX, DFPLAYER_TX);
DFRobotDFPlayerMini dfPlayer;

bool dfPlayerSiap = false;
bool tutupTerbuka = false;
bool suaraAktif = true;
bool siklusBuangAktif = false;
bool statusPenuh = false;
bool wifiSebelumnyaTerhubung = false;
bool suaraPernahDiputar = false;
bool firebaseTutupPernahDibaca = false;
bool nilaiTutupFirebaseTerakhir = false;

unsigned long terakhirOrangTerlihat = 0;
unsigned long sensorTerakhir = 0;
unsigned long wifiTerakhir = 0;
unsigned long suaraTerakhir = 0;
unsigned long firebaseBacaTerakhir = 0;
unsigned long firebaseKirimTerakhir = 0;

float jarakOrang = -1;
float jarakSampah = -1;
int kapasitasPersen = 0;
int sudutServoSaatIni = SUDUT_TUTUP;
String statusSuara = "Siap";

constexpr uint8_t UKURAN_ANTRIAN_SUARA = 6;
uint8_t antrianSuara[UKURAN_ANTRIAN_SUARA];
uint8_t kepalaSuara = 0;
uint8_t ekorSuara = 0;
uint8_t jumlahSuara = 0;

void gerakkanServoPerlahan(int sudutTujuan) {
  sudutTujuan = constrain(sudutTujuan, 0, 180);
  if (sudutServoSaatIni == sudutTujuan) return;

  int arah = sudutTujuan > sudutServoSaatIni ? 1 : -1;

  while (sudutServoSaatIni != sudutTujuan) {
    sudutServoSaatIni += arah;
    servoTutup.write(sudutServoSaatIni);
    delay(JEDA_SERVO_PER_DERAJAT_MS);
    yield();
  }
}

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
  if (!suaraAktif) {
    statusSuara = "Suara Nonaktif";
    return;
  }
  if (!dfPlayerSiap || jumlahSuara >= UKURAN_ANTRIAN_SUARA) {
    statusSuara = "DFPlayer belum siap";
    return;
  }
  antrianSuara[ekorSuara] = nomor;
  ekorSuara = (ekorSuara + 1) % UKURAN_ANTRIAN_SUARA;
  jumlahSuara++;
}

void prosesAntrianSuara(unsigned long sekarang) {
  if (!dfPlayerSiap || jumlahSuara == 0) {
    if (suaraAktif && suaraPernahDiputar &&
        sekarang - suaraTerakhir >= JEDA_SUARA_MS &&
        statusSuara != "Siap") {
      statusSuara = "Siap";
    }
    return;
  }
  if (suaraPernahDiputar && sekarang - suaraTerakhir < JEDA_SUARA_MS) return;

  uint8_t nomor = antrianSuara[kepalaSuara];
  kepalaSuara = (kepalaSuara + 1) % UKURAN_ANTRIAN_SUARA;
  jumlahSuara--;
  dfPlayer.playMp3Folder(nomor);
  statusSuara = "Memutar suara " + String(nomor);
  Serial.print("DFPlayer: memutar /mp3/000");
  Serial.print(nomor);
  Serial.println(".mp3");
  suaraTerakhir = sekarang;
  suaraPernahDiputar = true;
}

int hitungKapasitasPersen() {
  if (jarakSampah <= 0) return kapasitasPersen;

  float rentang = JARAK_SAMPAH_KOSONG_CM - BATAS_PENUH_CM;
  if (rentang <= 0) return kapasitasPersen;

  float persen = ((JARAK_SAMPAH_KOSONG_CM - jarakSampah) / rentang) * 100.0f;
  return constrain((int)round(persen), 0, 100);
}

const char* statusSampahFirebase() {
  if (kapasitasPersen >= 80) return "Penuh";
  if (kapasitasPersen >= 50) return "Sedang";
  return "Kosong";
}

bool firebaseDikonfigurasi() {
  return strlen(FIREBASE_DATABASE_URL) > 10;
}

String buatUrlFirebase(const char* path) {
  String url = FIREBASE_DATABASE_URL;
  url.trim();
  if (url.endsWith("/")) {
    url.remove(url.length() - 1);
  }

  url += "/";
  url += path;
  url += ".json";

  if (strlen(FIREBASE_AUTH) > 0) {
    url += "?auth=";
    url += FIREBASE_AUTH;
  }

  return url;
}

bool firebasePatch(const char* path, const String& body) {
  if (WiFi.status() != WL_CONNECTED || !firebaseDikonfigurasi()) return false;

  HTTPClient http;
  String url = buatUrlFirebase(path);

  if (!http.begin(firebaseClient, url)) {
    Serial.println("Firebase PATCH gagal: URL tidak valid.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  int kode = http.sendRequest("PATCH", body);
  bool berhasil = kode >= 200 && kode < 300;

  if (!berhasil) {
    Serial.print("Firebase PATCH gagal. HTTP ");
    Serial.println(kode);
  }

  http.end();
  return berhasil;
}

bool firebasePut(const char* path, const String& body) {
  if (WiFi.status() != WL_CONNECTED || !firebaseDikonfigurasi()) return false;

  HTTPClient http;
  String url = buatUrlFirebase(path);

  if (!http.begin(firebaseClient, url)) {
    Serial.println("Firebase PUT gagal: URL tidak valid.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  int kode = http.PUT(body);
  bool berhasil = kode >= 200 && kode < 300;

  if (!berhasil) {
    Serial.print("Firebase PUT gagal. HTTP ");
    Serial.println(kode);
  }

  http.end();
  return berhasil;
}

bool firebaseGet(const char* path, String& payload) {
  if (WiFi.status() != WL_CONNECTED || !firebaseDikonfigurasi()) return false;

  HTTPClient http;
  String url = buatUrlFirebase(path);

  if (!http.begin(firebaseClient, url)) {
    Serial.println("Firebase GET gagal: URL tidak valid.");
    return false;
  }

  int kode = http.GET();
  bool berhasil = kode >= 200 && kode < 300;

  if (berhasil) {
    payload = http.getString();
  } else {
    Serial.print("Firebase GET gagal. HTTP ");
    Serial.println(kode);
  }

  http.end();
  return berhasil;
}

void kirimDataKeFirebase() {
  StaticJsonDocument<512> data;
  data["kapasitas"] = kapasitasPersen;
  data["jarakOrang"] = jarakOrang > 0 ? (int)round(jarakOrang) : 0;
  data["jarakSampah"] = jarakSampah > 0 ? (int)round(jarakSampah) : 0;
  data["statusSampah"] = statusSampahFirebase();
  data["tutupTerbuka"] = tutupTerbuka;
  data["suaraAktif"] = suaraAktif;
  data["statusSuara"] = statusSuara;

  String body;
  serializeJson(data, body);

  if (firebasePatch("smartbin", body)) {
    nilaiTutupFirebaseTerakhir = tutupTerbuka;
    firebaseTutupPernahDibaca = true;
    Serial.println("Firebase: data sensor terkirim.");
  }
}

void aturTutupDariAplikasi(bool buka) {
  siklusBuangAktif = false;

  if (buka) {
    gerakkanServoPerlahan(SUDUT_BUKA);
    tutupTerbuka = true;
    Serial.println("Firebase: perintah buka tutup diterima.");
  } else {
    gerakkanServoPerlahan(SUDUT_TUTUP);
    tutupTerbuka = false;
    Serial.println("Firebase: perintah tutup diterima.");
  }
}

void prosesPerintahFirebase() {
  String payload;
  if (!firebaseGet("smartbin", payload)) return;

  StaticJsonDocument<768> data;
  DeserializationError error = deserializeJson(data, payload);
  if (error) {
    Serial.println("Firebase: JSON smartbin tidak bisa dibaca.");
    return;
  }

  if (data["suaraAktif"].is<bool>()) {
    suaraAktif = data["suaraAktif"].as<bool>();
    if (!suaraAktif) statusSuara = "Suara Nonaktif";
  }

  bool perintahTutupDiproses = false;
  if (data["perintahTutup"].is<bool>()) {
    bool perintahTutup = data["perintahTutup"].as<bool>();
    nilaiTutupFirebaseTerakhir = perintahTutup;
    firebaseTutupPernahDibaca = true;
    aturTutupDariAplikasi(perintahTutup);
    firebasePut("smartbin/perintahTutup", "null");
    perintahTutupDiproses = true;
  }

  if (!perintahTutupDiproses && data["tutupTerbuka"].is<bool>()) {
    bool nilaiTutup = data["tutupTerbuka"].as<bool>();

    // Nilai ini dianggap sebagai perintah hanya saat berubah dari aplikasi.
    if (!firebaseTutupPernahDibaca) {
      nilaiTutupFirebaseTerakhir = nilaiTutup;
      firebaseTutupPernahDibaca = true;
    } else if (nilaiTutup != nilaiTutupFirebaseTerakhir) {
      nilaiTutupFirebaseTerakhir = nilaiTutup;
      aturTutupDariAplikasi(nilaiTutup);
    }
  }

  int perintahSuara = data["perintahSuara"] | 0;
  if (perintahSuara >= 1 && perintahSuara <= 3) {
    antrekanSuara((uint8_t)perintahSuara);
    firebasePut("smartbin/perintahSuara", "0");
    Serial.print("Firebase: perintah suara diterima: ");
    Serial.println(perintahSuara);
  }
}

void prosesFirebase(unsigned long sekarang) {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!firebaseDikonfigurasi()) {
    static bool sudahPeringatkan = false;
    if (!sudahPeringatkan) {
      Serial.println("Firebase belum dikonfigurasi di bagian atas sketch.");
      sudahPeringatkan = true;
    }
    return;
  }

  if (sekarang - firebaseBacaTerakhir >= INTERVAL_FIREBASE_BACA_MS) {
    firebaseBacaTerakhir = sekarang;
    prosesPerintahFirebase();
  }

  if (sekarang - firebaseKirimTerakhir >= INTERVAL_FIREBASE_KIRIM_MS) {
    firebaseKirimTerakhir = sekarang;
    kirimDataKeFirebase();
  }
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

  // Ditampilkan saat pertama online maupun setelah tersambung kembali.
  if (wifiTerhubung && !wifiSebelumnyaTerhubung) {
    Serial.printf("Wi-Fi terhubung. IP: %s\n",
                  WiFi.localIP().toString().c_str());
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
      gerakkanServoPerlahan(SUDUT_BUKA);
      tutupTerbuka = true;
      nilaiTutupFirebaseTerakhir = true;
      antrekanSuara(SUARA_ADA_ORANG);
      Serial.println("Orang terdeteksi, tutup dibuka.");
    }
    return;
  }

  if (siklusBuangAktif &&
      sekarang - terakhirOrangTerlihat >= JEDA_TUTUP_MS) {
    gerakkanServoPerlahan(SUDUT_TUTUP);
    tutupTerbuka = false;
    nilaiTutupFirebaseTerakhir = false;
    siklusBuangAktif = false;
    antrekanSuara(SUARA_SELESAI);
    Serial.println("Selesai membuang, tutup ditutup.");
  }
}

void prosesKapasitasSampah() {
  if (jarakSampah <= 0) return;
  kapasitasPersen = hitungKapasitasPersen();

  if (!statusPenuh && kapasitasPersen >= 80) {
    statusPenuh = true;
    antrekanSuara(SUARA_PENUH);
    Serial.println("Tempat sampah penuh.");
  }

  // Hysteresis mencegah status penuh berubah-ubah saat jarak dekat batas.
  if (statusPenuh && kapasitasPersen < 50 &&
      jarakSampah > BATAS_KOSONG_KEMBALI_CM) {
    statusPenuh = false;
    Serial.println("Tempat sampah kosong dan siap digunakan kembali.");
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
  sudutServoSaatIni = SUDUT_TUTUP;

  dfSerial.begin(9600);
  delay(1200);
  if (dfPlayer.begin(dfSerial, true, true)) {
    dfPlayerSiap = true;
    dfPlayer.outputDevice(DFPLAYER_DEVICE_SD);
    delay(200);
    dfPlayer.volume(30);
    statusSuara = "DFPlayer siap";
    Serial.println("DFPlayer siap.");

    if (TES_SUARA_SAAT_NYALA) {
      antrekanSuara(SUARA_ADA_ORANG);
      Serial.println("DFPlayer: tes suara 1 dijadwalkan.");
    }
  } else {
    statusSuara = "DFPlayer belum siap";
    Serial.println("DFPlayer tidak terdeteksi. Periksa kabel dan microSD.");
  }

  firebaseClient.setInsecure();
  mulaiKoneksiWiFi();
}

void loop() {
  unsigned long sekarang = millis();
  prosesStatusWiFi(sekarang);
  prosesAntrianSuara(sekarang);
  prosesFirebase(sekarang);

  if (sekarang - sensorTerakhir >= INTERVAL_SENSOR_MS) {
    sensorTerakhir = sekarang;
    jarakOrang = bacaUltrasonik(TRIG_ORANG, ECHO_ORANG);
    delay(35);
    jarakSampah = bacaUltrasonik(TRIG_SAMPAH, ECHO_SAMPAH);

    kapasitasPersen = hitungKapasitasPersen();

    Serial.printf("Orang: %.1f cm | Sampah: %.1f cm | Kapasitas: %d%% | Penuh: %s\n",
                  jarakOrang, jarakSampah, kapasitasPersen,
                  statusPenuh ? "YA" : "TIDAK");
    prosesSensorOrang(sekarang);
    prosesKapasitasSampah();
  }
  yield();
}
