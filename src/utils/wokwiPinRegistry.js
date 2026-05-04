// This registry maps the physical pins of Wokwi components to their 
// relative {x, y} pixel coordinates within the Konva Group.
// These are approximate and can be refined later for pixel-perfect snapping.

export const WokwiPinRegistry = {
  "wokwi-arduino-uno": {
  width: 274,
  height: 201,
  hitboxX: 0,
  hitboxY: 0,
  pins: {
    "A5_TOP": { x: 86, y: 9, width: 7, height: 7, name: "A5.2" },
    "A4_TOP": { x: 95, y: 9, width: 7, height: 7, name: "A4.2" },
    "AREF": { x: 105, y: 9, width: 7, height: 7, name: "AREF" },
    "GND_TOP": { x: 115, y: 9, width: 7, height: 7, name: "GND" },
    "D13": { x: 125, y: 9, width: 7, height: 7, name: "13" },
    "D12": { x: 134, y: 9, width: 7, height: 6, name: "12" },
    "D11": { x: 144, y: 9, width: 7, height: 7, name: "11" },
    "D10": { x: 153, y: 9, width: 7, height: 7, name: "10" },
    "D9": { x: 163, y: 9, width: 7, height: 7, name: "9" },
    "D8": { x: 174, y: 9, width: 7, height: 7, name: "8" },
    "D7": { x: 188, y: 9, width: 7, height: 7, name: "7" },
    "D6": { x: 198, y: 9, width: 7, height: 7, name: "6" },
    "D5": { x: 207, y: 9, width: 7, height: 7, name: "5" },
    "D4": { x: 216, y: 9, width: 7, height: 7, name: "4" },
    "D3": { x: 226, y: 9, width: 7, height: 7, name: "3" },
    "D2": { x: 236, y: 9, width: 7, height: 7, name: "2" },
    "D1": { x: 246, y: 9, width: 7, height: 7, name: "1" },
    "D0": { x: 256, y: 9, width: 7, height: 7, name: "0" },
    "IOREF": { x: 130, y: 192, width: 7, height: 7, name: "IOREF" },
    "RESET": { x: 140, y: 192, width: 7, height: 7, name: "RESET" },
    "3V3": { x: 150, y: 192, width: 7, height: 7, name: "3.3V" },
    "5V": { x: 160, y: 192, width: 7, height: 7, name: "5V" },
    "GND_BOT1": { x: 170, y: 192, width: 7, height: 7, name: "GND" },
    "GND_BOT2": { x: 179, y: 192, width: 7, height: 7, name: "GND" },
    "VIN": { x: 189, y: 192, width: 7, height: 7, name: "VIN" },
    "A0": { x: 207, y: 192, width: 7, height: 7, name: "A0" },
    "A1": { x: 217, y: 192, width: 7, height: 7, name: "A1" },
    "A2": { x: 227, y: 192, width: 7, height: 7, name: "A2" },
    "A3": { x: 237, y: 192, width: 7, height: 7, name: "A3" },
    "A4": { x: 246, y: 192, width: 7, height: 7, name: "A4" },
    "A5": { x: 255, y: 192, width: 7, height: 7, name: "A5" }
    }
  },
  "wokwi-led": {
  width: 18,
  height: 40,
  hitboxX: 10,
  hitboxY: 7,
  pins: {
    "anode": { x: 25, y: 44, width: 7, height: 7, name: "A" },
    "cathode": { x: 14, y: 43, width: 7, height: 7, name: "C" }
    }
  },
  'wokwi-breadboard': {
    width: 400,
    height: 280,
    // Breadboard has hundreds of pins. For POC, we might not map them all,
    // or we'd write a function to generate the grid programmatically.
    pins: {
      'power_plus': { x: 20, y: 15, name: '+' },
      'power_minus': { x: 20, y: 35, name: '-' },
    }
  }
};
