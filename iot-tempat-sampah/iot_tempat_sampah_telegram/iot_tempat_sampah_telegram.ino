#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#include <UniversalTelegramBot.h>
#include <Servo.h>
#include <SoftwareSerial.h>
#include <DFRobotDFPlayerMini.h>

// Isi dengan kredensial baru sebelum upload.
// Token lama yang pernah dibagikan sebaiknya di-revoke melalui BotFather.
const char* WIFI_SSID = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";
const char* BOT_TOKEN = "TOKEN_BOT_TELEGRAM_BARU";
const char* CHAT_ID = "CHAT_ID_TELEGRAM";

// ================================================================
// PIN NODEMCU ESP8266
// ================================================================
constexpr uint8_t TRIG_ORANG = D7;
constexpr uint8_t ECHO_ORANG = D5;
constexpr uint8_t TRIG_SAMPAH = D0;
constexpr uint8_t ECHO_SAMPAH = D8;
constexpr uint8_t PIN_SERVO = D6;

// SoftwareSerial menggunakan urutan (RX ESP8266, TX ESP8266):
// TX DFPlayer -> D2 (RX ESP8266)
// RX DFPlayer <- D1 (TX ESP8266), melalui resistor 1 kOhm
constexpr uint8_t DFPLAYER_RX_ESP = D1;
constexpr uint8_t DFPLAYER_TX_ESP = D2;

constexpr float BATAS_ORANG_CM = 50.0f;
constexpr float BATAS_PENUH_CM = 4.0f;
constexpr float RESET_PENUH_CM = 15.0f;

constexpr int SUDUT_TUTUP = 165;
constexpr int SUDUT_BUKA = 75;
constexpr uint8_t JEDA_GERAK_SERVO_MS = 15;

constexpr uint8_t VOLUME_DFPLAYER = 22;  // rentang 0-30
constexpr unsigned long JEDA_TUTUP_MS = 2000UL;
constexpr unsigned long INTERVAL_SENSOR_MS = 300UL;
constexpr unsigned long INTERVAL_WIFI_MS = 10000UL;

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

float jarakOrang = -1.0f;
float jarakSampah = -1.0f;
uint8_t hitungPenuh = 0;
uint8_t hitungKosong = 0;
unsigned long terakhirOrangTerlihat = 0;
unsigned long sensorTerakhir = 0;
unsigned long wifiTerakhir = 0;

bool kirimTelegram(const String& pesan) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("Telegram belum dikirim: Wi-Fi belum terhubung."));
    return false;
  }

  bool terkirim = bot.sendMessage(CHAT_ID, pesan, "");
  Serial.println(terkirim ? F("Telegram: pesan terkirim.")
                          : F("Telegram: pesan gagal dikirim."));
  return terkirim;
}

void mulaiWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println(F("Mencoba menghubungkan Wi-Fi..."));
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
    Serial.print(F("Wi-Fi terhubung. IP: "));
    Serial.println(WiFi.localIP());
    kirimTelegram(F("sistem aktif"));
  }

  if (!wifiTerhubung && wifiSebelumnyaTerhubung) {
    Serial.println(F("Wi-Fi terputus; sistem lokal tetap berjalan."));
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
  if (durasi == 0) return -1.0f;

  float jarak = durasi * 0.0343f / 2.0f;
  if (jarak < 2.0f || jarak > 400.0f) return -1.0f;
  return jarak;
}

void putarSuaraSekarang(uint8_t nomor) {
  if (!dfPlayerSiap) {
    Serial.println(F("DFPlayer belum siap."));
    return;
  }

  Serial.print(F("Memutar /mp3/000"));
  Serial.print(nomor);
  Serial.println(F(".mp3"));
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
    Serial.println(F("Tempat sampah penuh: perintah membuka diabaikan."));
    return;
  }

  if (tutupTerbuka) return;

  tutupTerbuka = true;
  putarSuaraSekarang(1);
  gerakkanServoPerlahan(SUDUT_BUKA);
  Serial.println(F("Orang <50 cm: tempat sampah terbuka."));
}

void tutupTempatSampah() {
  if (!tutupTerbuka) return;

  tutupTerbuka = false;
  putarSuaraSekarang(2);
  gerakkanServoPerlahan(SUDUT_TUTUP);
  Serial.println(F("Orang >50 cm: tempat sampah tertutup."));
}

void prosesKapasitasSampah() {
  if (jarakSampah <= 0.0f) {
    hitungPenuh = 0;
    hitungKosong = 0;
    return;
  }

  if (!statusPenuh) {
    hitungKosong = 0;

    if (jarakSampah < BATAS_PENUH_CM) {
      if (hitungPenuh < 3) hitungPenuh++;
    } else {
      hitungPenuh = 0;
    }

    if (hitungPenuh >= 3) {
      statusPenuh = true;
      hitungPenuh = 0;
      peringatanPenuhSudahDiputar = false;

      if (tutupTerbuka || posisiServo != SUDUT_TUTUP) {
        tutupTerbuka = false;
        gerakkanServoPerlahan(SUDUT_TUTUP);
      }

      Serial.println(F("TEMPAT SAMPAH PENUH (<4 cm)."));
      kirimTelegram(F("tempat sampah penuh, silakan dikosongkan"));
    }
    return;
  }

  hitungPenuh = 0;
  if (jarakSampah > RESET_PENUH_CM) {
    if (hitungKosong < 3) hitungKosong++;
  } else {
    hitungKosong = 0;
  }

  if (hitungKosong >= 3) {
    statusPenuh = false;
    hitungKosong = 0;
    peringatanPenuhSudahDiputar = false;
    Serial.println(F("Tempat sampah kosong: siap digunakan kembali."));
    kirimTelegram(F("tempat sampah kosong, siap digunakan"));
  }
}

void prosesSensor(unsigned long sekarang) {
  if (statusPenuh) {
    if (tutupTerbuka || posisiServo != SUDUT_TUTUP) {
      tutupTerbuka = false;
      gerakkanServoPerlahan(SUDUT_TUTUP);
    }

    // Peringatan hanya sekali untuk setiap orang yang mendekat.
    if (jarakOrang > 0.0f && jarakOrang < BATAS_ORANG_CM) {
      if (!peringatanPenuhSudahDiputar) {
        putarSuaraSekarang(3);
        peringatanPenuhSudahDiputar = true;
        Serial.println(F("Orang mendekat, tetapi tempat sampah penuh."));
      }
    } else {
      peringatanPenuhSudahDiputar = false;
    }
    return;
  }

  if (jarakOrang > 0.0f && jarakOrang < BATAS_ORANG_CM) {
    terakhirOrangTerlihat = sekarang;
    bukaTempatSampah();
    return;
  }

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
        Serial.println(F("Tes manual ditolak: tempat sampah masih penuh."));
      } else {
        gerakkanServoPerlahan(SUDUT_BUKA);
        tutupTerbuka = true;
        Serial.println(F("Tes manual: servo dibuka."));
      }
      break;

    case 'C':
      gerakkanServoPerlahan(SUDUT_TUTUP);
      tutupTerbuka = false;
      Serial.println(F("Tes manual: servo ditutup."));
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
  Serial.println(F("=== 2 ULTRASONIK + DFPLAYER + SERVO + TELEGRAM ==="));

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
  Serial.print(F("Servo siap di D6, posisi tertutup "));
  Serial.print(SUDUT_TUTUP);
  Serial.println(F(" derajat."));

  dfSerial.begin(9600);
  delay(1000);

  if (dfPlayer.begin(dfSerial, true, true)) {
    dfPlayerSiap = true;
    Serial.println(F("DFPlayer terdeteksi."));
  } else {
    // Beberapa modul clone menerima perintah tetapi tidak mengirim ACK.
    Serial.println(F("DFPlayer tidak membalas; mencoba mode tanpa ACK."));
    dfPlayer.begin(dfSerial, false, false);
    dfPlayerSiap = true;
    dfPlayerTanpaACK = true;
  }

  dfPlayer.volume(VOLUME_DFPLAYER);

  secureClient.setInsecure();
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  mulaiWiFi();

  Serial.println(F("Menunggu objek pada jarak kurang dari 50 cm..."));
  Serial.println(F("Manual: O=buka, C=tutup, 1/2/3=putar suara."));
}

void loop() {
  unsigned long sekarang = millis();
  prosesWiFi(sekarang);
  prosesPerintahSerial();

  if (sekarang - sensorTerakhir >= INTERVAL_SENSOR_MS) {
    sensorTerakhir = sekarang;
    jarakOrang = bacaJarakCm(TRIG_ORANG, ECHO_ORANG);
    delay(40);  // Mencegah dua ultrasonik saling mengganggu.
    jarakSampah = bacaJarakCm(TRIG_SAMPAH, ECHO_SAMPAH);

    Serial.print(F("Orang: "));
    if (jarakOrang < 0.0f) {
      Serial.print(F("GAGAL"));
    } else {
      Serial.print(jarakOrang, 1);
      Serial.print(F(" cm"));
    }

    Serial.print(F(" | Sampah: "));
    if (jarakSampah < 0.0f) {
      Serial.print(F("GAGAL"));
    } else {
      Serial.print(jarakSampah, 1);
      Serial.print(F(" cm"));
    }

    Serial.print(F(" | Penuh: "));
    Serial.println(statusPenuh ? F("YA") : F("TIDAK"));

    prosesKapasitasSampah();
    prosesSensor(sekarang);
  }

  if (dfPlayerSiap && !dfPlayerTanpaACK && dfPlayer.available()) {
    uint8_t tipe = dfPlayer.readType();
    int nilai = dfPlayer.read();
    Serial.print(F("Status DFPlayer: tipe="));
    Serial.print(tipe);
    Serial.print(F(", nilai="));
    Serial.println(nilai);
  }

  delay(10);
}
