import { CPU, avrInstruction, AVRIOPort, portBConfig, AVRTimer, timer0Config } from 'avr8js';

// Simple intel hex parser
function loadHex(source, target) {
  for (const line of source.split('\n')) {
    if (line[0] === ':' && line.substr(7, 2) === '00') {
      const bytes = parseInt(line.substr(1, 2), 16);
      const addr = parseInt(line.substr(3, 4), 16);
      for (let i = 0; i < bytes; i++) {
        target[addr + i] = parseInt(line.substr(9 + i * 2, 2), 16);
      }
    }
  }
}

let cpu;
let portB;
let timer;
let isRunning = false;

self.onmessage = (e) => {
  const { type, hex } = e.data;

  if (type === 'START') {
    // 1. Initialize CPU
    cpu = new CPU(new Uint16Array(32768));
    
    // 2. Load HEX into flash
    loadHex(hex, new Uint8Array(cpu.progBytes.buffer));
    
    // 3. Initialize peripherals
    portB = new AVRIOPort(cpu, portBConfig);
    timer = new AVRTimer(cpu, timer0Config);
    
    // 4. Listen to Port B state changes (PB5 is pin 13)
    portB.addListener((state) => {
      // state is the byte value of PORTB
      // PB5 is bit 5 (0x20)
      const isPin13High = (state & 0x20) !== 0;
      self.postMessage({ type: 'PIN_STATE', pin: 13, value: isPin13High });
    });

    isRunning = true;
    runEmulator();
  } else if (type === 'STOP') {
    isRunning = false;
  }
};

function runEmulator() {
  if (!isRunning) return;

  // Run enough cycles to simulate ~16ms of real time (for ~60fps UI updates)
  // Arduino Uno runs at 16MHz, so 16ms = 250,000 cycles
  const cyclesToRun = 250000; 
  const targetCycle = cpu.cycles + cyclesToRun;

  while (cpu.cycles < targetCycle) {
    avrInstruction(cpu); // Execute one instruction
    cpu.tick();          // Tick the timers
  }

  // Yield the thread so the worker can process incoming messages 
  // and send outgoing postMessages, then immediately schedule the next batch
  setTimeout(runEmulator, 0);
}
