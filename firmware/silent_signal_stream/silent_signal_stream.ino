// esp32 program — sample two EMG ADC channels @500Hz, stream "adc1<TAB>adc2" over USB serial
//
// Plain tab-separated integers, one sample pair per line: readable in the Serial
// Monitor and plotted as two traces by the Serial Plotter. Baud 115200.

// ---------------------------------------------------------------- configuration
// ADC1 pins only (GPIO32-39); ADC2 is unusable while WiFi is active.
const int EMG_PIN_A = 34;   // EMG sensor 1 signal out (input-only, no internal pulls)
const int EMG_PIN_B = 32;   // EMG sensor 2 signal out (supports internal pull-down)

const long SERIAL_BAUD    = 115200;
const int  ADC_BITS       = 12;    // 12 bits -> 0..4095
const int  SAMPLE_RATE_HZ = 500;   // matches config.py SAMPLE_HZ

// Diagnostic: with the pull-down on, an UNDRIVEN GPIO32 reads a flat ~0 instead of
// floating rail-to-rail. A real sensor output (low impedance) overrides it easily,
// so this stays safe to leave enabled while recording.
#define PULLDOWN_ON_B 1

const unsigned long SAMPLE_INTERVAL_US = 1000000UL / SAMPLE_RATE_HZ;
unsigned long nextSampleUs = 0;

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(200);
  analogReadResolution(ADC_BITS);
  analogSetPinAttenuation(EMG_PIN_A, ADC_2_5db);
  analogSetPinAttenuation(EMG_PIN_B, ADC_2_5db);
#if PULLDOWN_ON_B
  pinMode(EMG_PIN_B, INPUT_PULLDOWN);
#endif
  nextSampleUs = micros();
}

void loop() {
  if ((long)(micros() - nextSampleUs) < 0) {
    return;
  }
  nextSampleUs += SAMPLE_INTERVAL_US;

  int emgA = analogRead(EMG_PIN_A);
  int emgB = analogRead(EMG_PIN_B);

  Serial.println(emgA);
  //Serial.print('\t');
  //Serial.println(emgB);
}
