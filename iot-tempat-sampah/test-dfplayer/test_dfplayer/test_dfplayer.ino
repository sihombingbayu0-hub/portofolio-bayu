#include <DFRobotDFPlayerMini.h>
#include <Servo.h>
#include <SoftwareSerial.h>

// DFPlayer pakai pin D2 (RX) dan D1 (TX)
SoftwareSerial mySerial(2, 1); // RX, TX
DFRobotDFPlayerMini myDFPlayer;

Servo myServo;

void setup() {
  mySerial.begin(9600);
  Serial.begin(9600);

  if (!myDFPlayer.begin(mySerial)) {
    Serial.println("DFPlayer tidak terdeteksi!");
    while(true);
  }
  Serial.println("DFPlayer Mini siap.");

  myDFPlayer.volume(20);   // Set volume (0-30)
  myDFPlayer.play(1);      // Mainkan file pertama di SD card

  myServo.attach(6);       // Servo di
