import { ArduinoUnoModel } from './models/ArduinoUnoModel';
import { LedModel } from './models/LedModel';

export class SimulationEngine {
    constructor() {
        this.models = {};
        this.nets = {}; // netId -> current value (true/false)
        this.pinToNet = {};
        this.netToPins = {};
        this.isRunning = false;
    }

    init(netlist, hex) {
        this.pinToNet = netlist.pinToNet;
        this.netToPins = netlist.nets;
        
        // Initialize default ground nets
        // In a real simulator, specific pins might default to ground.
        // We will default all nets to false (LOW) initially.
        Object.keys(this.netToPins).forEach(netId => {
            this.nets[netId] = false;
        });
        
        netlist.components.forEach(comp => {
            if (comp.type === 'wokwi-arduino-uno') {
                this.models[comp.id] = new ArduinoUnoModel(comp.id, this, hex);
            } else if (comp.type === 'wokwi-led') {
                this.models[comp.id] = new LedModel(comp.id, this);
            }
        });
    }

    setPinState(compId, pinId, isHigh) {
        const node = `${compId}:${pinId}`;
        const netId = this.pinToNet[node];
        if (!netId) return;

        if (this.nets[netId] !== isHigh) {
            console.log(`[Engine] Pin state changed: ${node} is now ${isHigh ? 'HIGH' : 'LOW'} on ${netId}`);
            this.nets[netId] = isHigh;
            // Notify other components on this net
            this.netToPins[netId].forEach(target => {
                if (target.comp !== compId) { // Don't notify the setter
                    const model = this.models[target.comp];
                    if (model) {
                        model.onNetChange(target.pin, isHigh);
                    }
                }
            });
        }
    }

    getPinState(compId, pinId) {
        const node = `${compId}:${pinId}`;
        const netId = this.pinToNet[node];
        return netId ? (this.nets[netId] === true) : false;
    }

    run() {
      this.isRunning = true;
      this.runLoop();
    }

    stop() {
      this.isRunning = false;
      Object.values(this.models).forEach(m => m.stop && m.stop());
    }

    runLoop = () => {
      if (!this.isRunning) return;

      try {
        // Run MCU cycles
        Object.values(this.models).forEach(m => {
            if (m.execute) m.execute();
        });
      } catch(e) {
          console.error('Simulation crashed', e);
          this.isRunning = false;
          return;
      }

      setTimeout(this.runLoop, 0); // Yield thread
    }
}