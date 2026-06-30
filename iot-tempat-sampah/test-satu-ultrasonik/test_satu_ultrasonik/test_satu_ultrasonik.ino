// Tes satu HC-SR04 pada NodeMCU ESP8266
// TRIG -> D7
// ECHO -> D5 melalui pembagi tegangan 1 kOhm + 2 kOhm

constexpr uint8_t PIN_TRIG = D7;
constexpr uint8_t PIN_ECHO = D5;
constexpr float BATAS_DETEKSI_CM = 50.0;
constexpr unsigned long INTERVAL_BACA_MS = 500;

unsigned long pembacaanTerakhir = 0;
bool sebelumnyaTerdeteksi = false;

float bacaJarakCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long durasi = pulseIn(PIN_ECHO, HIGH, 30000UL);
  if (durasi == 0) return -1;

  float jarak = durasi * 0.0343f / 2.0f;
  if (jarak < 2.0f || jarak > 400.0f) return -1;
  return jarak;
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  delay(500);
  Serial.println();
  Serial.println("=== TES SATU ULTRASONIK HC-SR04 ===");
  Serial.println("TRIG=D7, ECHO=D5, batas deteksi kurang dari 50 cm");
}

void loop() {
  unsigned long sekarang = millis();
  if (sekarang - pembacaanTerakhir < INTERVAL_BACA_MS) return;
  pembacaanTerakhir = sekarang;

  float jarak = bacaJarakCm();

  if (jarak < 0) {
    Serial.println("GAGAL MEMBACA (-1): periksa VCC, GND, TRIG, ECHO, dan resistor");
    sebelumnyaTerdeteksi = false;
    return;
  }

  Serial.print("Jarak: ");
  Serial.print(jarak, 1);
  Serial.print(" cm | Status: ");

  bool terdeteksi = jarak < BATAS_DETEKSI_CM;
  Serial.println(terdeteksi ? "TERDETEKSI (<50 cm)" : "TIDAK TERDETEKSI");

  if (terdeteksi && !sebelumnyaTerdeteksi) {
    Serial.println(">>> OBJEK MASUK AREA 50 CM <<<");
  } else if (!terdeteksi && sebelumnyaTerdeteksi) {
    Serial.println(">>> OBJEK KELUAR DARI AREA 50 CM <<<");
  }

  sebelumnyaTerdeteksi = terdeteksi;
}
