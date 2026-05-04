const buildComponent = (type, label, category, defaultProps = {}) => ({
  type,
  label,
  category,
  defaultProps,
});

export const WOKWI_COMPONENT_CATALOG = [
  buildComponent('wokwi-arduino-uno', 'Arduino Uno', 'Boards'),
  buildComponent('wokwi-arduino-mega', 'Arduino Mega', 'Boards'),
  buildComponent('wokwi-arduino-nano', 'Arduino Nano', 'Boards'),
  buildComponent('wokwi-esp32-devkit-v1', 'ESP32 DevKit v1', 'Boards'),
  buildComponent('wokwi-franzininho', 'Franzininho', 'Boards'),
  buildComponent('wokwi-nano-rp2040-connect', 'Nano RP2040 Connect', 'Boards'),

  buildComponent('wokwi-7segment', '7-Segment Display', 'Displays'),
  buildComponent('wokwi-ili9341', 'ILI9341 TFT', 'Displays'),
  buildComponent('wokwi-lcd1602', 'LCD 1602', 'Displays'),
  buildComponent('wokwi-lcd2004', 'LCD 2004', 'Displays'),
  buildComponent('wokwi-led-bar-graph', 'LED Bar Graph', 'Displays'),
  buildComponent('wokwi-neopixel-ring', 'LED Ring', 'Displays'),
  buildComponent('wokwi-neopixel-matrix', 'NeoPixel Matrix', 'Displays'),
  buildComponent('wokwi-ssd1306', 'SSD1306 OLED', 'Displays'),

  buildComponent('wokwi-analog-joystick', 'Analog Joystick', 'Inputs'),
  buildComponent('wokwi-dip-switch-8', 'DIP Switch 8', 'Inputs'),
  buildComponent('wokwi-ir-remote', 'IR Remote', 'Inputs'),
  buildComponent('wokwi-ky-040', 'KY-040 Rotary Encoder', 'Inputs'),
  buildComponent('wokwi-membrane-keypad', 'Membrane Keypad', 'Inputs'),
  buildComponent('wokwi-pushbutton', 'Pushbutton', 'Inputs'),
  buildComponent('wokwi-pushbutton-6mm', 'Pushbutton 6mm', 'Inputs'),
  buildComponent('wokwi-rotary-dialer', 'Rotary Dialer', 'Inputs'),
  buildComponent('wokwi-slide-switch', 'Slide Switch', 'Inputs'),
  buildComponent('wokwi-slide-potentiometer', 'Slide Potentiometer', 'Inputs'),
  buildComponent('wokwi-potentiometer', 'Potentiometer', 'Inputs'),

  buildComponent('wokwi-big-sound-sensor', 'Big Sound Sensor', 'Sensors'),
  buildComponent('wokwi-dht22', 'DHT22', 'Sensors'),
  buildComponent('wokwi-flame-sensor', 'Flame Sensor', 'Sensors'),
  buildComponent('wokwi-gas-sensor', 'Gas Sensor', 'Sensors'),
  buildComponent('wokwi-hc-sr04', 'HC-SR04 Ultrasonic', 'Sensors'),
  buildComponent('wokwi-heart-beat-sensor', 'Heart Beat Sensor', 'Sensors'),
  buildComponent('wokwi-hx711', 'HX711', 'Sensors'),
  buildComponent('wokwi-ir-receiver', 'IR Receiver', 'Sensors'),
  buildComponent('wokwi-mpu6050', 'MPU6050', 'Sensors'),
  buildComponent('wokwi-ntc-temperature-sensor', 'NTC Temperature Sensor', 'Sensors'),
  buildComponent('wokwi-photoresistor-sensor', 'Photoresistor Sensor', 'Sensors'),
  buildComponent('wokwi-pir-motion-sensor', 'PIR Motion Sensor', 'Sensors'),
  buildComponent('wokwi-small-sound-sensor', 'Small Sound Sensor', 'Sensors'),
  buildComponent('wokwi-tilt-switch', 'Tilt Switch', 'Sensors'),

  buildComponent('wokwi-buzzer', 'Buzzer', 'Outputs'),
  buildComponent('wokwi-led', 'LED', 'Outputs', { color: 'red' }),
  buildComponent('wokwi-neopixel', 'NeoPixel', 'Outputs'),
  buildComponent('wokwi-rgb-led', 'RGB LED', 'Outputs'),
  buildComponent('wokwi-servo', 'Servo', 'Outputs'),
  buildComponent('wokwi-stepper-motor', 'Stepper Motor', 'Outputs'),
  buildComponent('wokwi-biaxial-stepper', 'Biaxial Stepper', 'Outputs'),

  buildComponent('wokwi-ds1307', 'DS1307 RTC', 'Modules'),
  buildComponent('wokwi-ks2e-m-dc5', 'KS2E-M-DC5 Relay', 'Modules'),
  buildComponent('wokwi-microsd-card', 'MicroSD Card', 'Modules'),
  buildComponent('wokwi-resistor', 'Resistor', 'Modules'),
];

export const WOKWI_COMPONENT_MAP = Object.fromEntries(
  WOKWI_COMPONENT_CATALOG.map((component) => [component.type, component])
);

export const getWokwiComponentDefinition = (type) => WOKWI_COMPONENT_MAP[type] ?? null;

export const getWokwiComponentLabel = (type) => getWokwiComponentDefinition(type)?.label ?? type;

export const getWokwiComponentsByCategory = () => {
  return WOKWI_COMPONENT_CATALOG.reduce((groups, component) => {
    if (!groups[component.category]) {
      groups[component.category] = [];
    }

    groups[component.category].push(component);
    return groups;
  }, {});
};