#include "SoftwareSerial.h"
#include "DFRobotDFPlayerMini.h"

// Konfigurasi Software Serial untuk komunikasi dengan DFPlayer Mini
// Pin 10 sebagai RX (ke TX DFPlayer), Pin 11 sebagai TX (ke RX DFPlayer dengan resistor 1k)
SoftwareSerial mySoftwareSerial(10, 11); 
DFRobotDFPlayerMini myDFPlayer;

void setup() {
  // Memulai komunikasi serial ke Serial Monitor (untuk debug)
  Serial.begin(9600);
  
  // Memulai komunikasi serial ke DFPlayer Mini
  mySoftwareSerial.begin(9600);

  Serial.println(F("Menginisialisasi DFPlayer..."));

  // Cek apakah DFPlayer terhubung dengan benar
  if (!myDFPlayer.begin(mySoftwareSerial)) {
    Serial.println(F("Gagal mendeteksi DFPlayer:"));
    Serial.println(F("1. Periksa kembali kabel rangkaian Anda."));
    Serial.println(F("2. Pastikan MicroSD sudah dimasukkan."));
    while(true); // Kunci program jika gagal
  }
  
  Serial.println(F("DFPlayer Mini online!"));
  
  // Atur volume suara (Nilai dari 0 sampai 30)
  myDFPlayer.volume(20);  
}

void loop() {
  // 1. Putar Suara Pertama (0001.mp3)
  Serial.println(F("Memutar Suara 1..."));
  myDFPlayer.playMp3Folder(1); 
  delay(5000); // Tunggu selama 5 detik sebelum ganti suara berikutnya

  // 2. Putar Suara Kedua (0002.mp3)
  Serial.println(F("Memutar Suara 2..."));
  myDFPlayer.playMp3Folder(2); 
  delay(5000); 

  // 3. Putar Suara Ketiga (0003.mp3)
  Serial.println(F("Memutar Suara 3..."));
  myDFPlayer.playMp3Folder(3); 
  delay(5000); 
}
