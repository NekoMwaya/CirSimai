import { BaseModel } from './BaseModel';
import { CPU, avrInstruction, AVRIOPort, portBConfig, portCConfig, portDConfig, AVRTimer, timer0Config } from 'avr8js';

// Robust intel hex parser
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

export class ArduinoUnoModel extends BaseModel {
  constructor(id, engine, hex) {
    super(id, engine);
    
    this.cpu = new CPU(new Uint16Array(32768));
    loadHex(hex, new Uint8Array(this.cpu.progBytes.buffer));
    
    this.timer0 = new AVRTimer(this.cpu, timer0Config); // Timer0 for delay()
    
    // Setup Ports
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);

    // Listeners translating Port bit changes to Arduino physical pins
    this.portB.addListener((state) => {
      this.engine.setPinState(this.id, 'D8', (state & 0x01) !== 0);
      this.engine.setPinState(this.id, 'D9', (state & 0x02) !== 0);
      this.engine.setPinState(this.id, 'D10', (state & 0x04) !== 0);
      this.engine.setPinState(this.id, 'D11', (state & 0x08) !== 0);
      this.engine.setPinState(this.id, 'D12', (state & 0x10) !== 0);
      this.engine.setPinState(this.id, 'D13', (state & 0x20) !== 0);
    });

    this.portC.addListener((state) => {
      this.engine.setPinState(this.id, 'A0', (state & 0x01) !== 0);
      this.engine.setPinState(this.id, 'A1', (state & 0x02) !== 0);
      this.engine.setPinState(this.id, 'A2', (state & 0x04) !== 0);
      this.engine.setPinState(this.id, 'A3', (state & 0x08) !== 0);
      this.engine.setPinState(this.id, 'A4', (state & 0x10) !== 0);
      this.engine.setPinState(this.id, 'A5', (state & 0x20) !== 0);
    });

    this.portD.addListener((state) => {
      this.engine.setPinState(this.id, 'D0', (state & 0x01) !== 0);
      this.engine.setPinState(this.id, 'D1', (state & 0x02) !== 0);
      this.engine.setPinState(this.id, 'D2', (state & 0x04) !== 0);
      this.engine.setPinState(this.id, 'D3', (state & 0x08) !== 0);
      this.engine.setPinState(this.id, 'D4', (state & 0x10) !== 0);
      this.engine.setPinState(this.id, 'D5', (state & 0x20) !== 0);
      this.engine.setPinState(this.id, 'D6', (state & 0x40) !== 0);
      this.engine.setPinState(this.id, 'D7', (state & 0x80) !== 0);
    });
  }

  // To support input from components reading (e.g. Buttons connected to Arduino)
  onNetChange(pinId, isHigh) {
    // If a button drives a net high/low, we would write that to the PIN register here.
    // e.g., if pinId === 'D2', write to Pin D bit 2.
    // For pure output simulation, we don't strictly need this yet.
  }

  execute() {
    // Run enough cycles to simulate ~16ms of real time (for ~60fps UI updates)
    const cyclesToRun = 500000; 
    const targetCycle = this.cpu.cycles + cyclesToRun;

    while (this.cpu.cycles < targetCycle) {
      avrInstruction(this.cpu);
      this.cpu.tick(); 
    }
  }
}