// esp32 program — sample the EMG ADC channel @500Hz, stream one reading per line
//
// Single channel for now: GPIO34 is physically unconnected, and reading two ADC1
// pins per loop makes the core reconfigure the ADC on every analogRead, which
// throttles the loop to ~10Hz. One pin sustains a verified 500Hz.
// To go back to two channels, re-add EMG_PIN_A and re-measure the rate first.

const int EMG_PIN = 32;            // sensor SIG, via the 10k/3.3k divider

const long SERIAL_BAUD    = 115200;
const int  ADC_BITS       = 12;    // 0..4095
const int  SAMPLE_RATE_HZ = 500;   // matches config.py SAMPLE_HZ

const unsigned long SAMPLE_INTERVAL_US = 1000000UL / SAMPLE_RATE_HZ;
unsigned long nextSampleUs = 0;

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(200);
  analogReadResolution(ADC_BITS);
  nextSampleUs = micros();
}

void loop() {
  if ((long)(micros() - nextSampleUs) < 0) {
    return;
  }
  nextSampleUs += SAMPLE_INTERVAL_US;

  Serial.println(analogRead(EMG_PIN));
}
