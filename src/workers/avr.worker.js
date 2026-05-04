import { SimulationEngine } from './SimulationEngine';

let engine;

self.onmessage = (e) => {
  const { type, hex, netlist } = e.data;

  if (type === 'START') {
    engine = new SimulationEngine();
    engine.init(netlist, hex);
    engine.run();
  } else if (type === 'STOP') {
    if (engine) engine.stop();
  }
};
