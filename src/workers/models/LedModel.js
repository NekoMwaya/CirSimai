import { BaseModel } from './BaseModel';

export class LedModel extends BaseModel {
  constructor(id, engine) {
    super(id, engine);
    this.isLit = false;
  }

  onNetChange(pinId, isHigh) {
    const anodeState = this.engine.getPinState(this.id, 'anode');
    // If cathode isn't connected, assume it's grounded to 0V for now,
    // though in a strict sim, it should be Floating.
    // For simplicity: LED drops to ground physically.
    const cathodeState = this.engine.getPinState(this.id, 'cathode'); 

    // LED is lit if anode is HIGH and cathode is LOW
    const shouldBeLit = anodeState === true && cathodeState === false;
    
    console.log(`[LedModel ${this.id}] Net changed! Anode: ${anodeState}, Cathode: ${cathodeState} -> Lit: ${shouldBeLit}`);

    if (this.isLit !== shouldBeLit) {
      this.isLit = shouldBeLit;
      this.updateUI({ lit: shouldBeLit });
    }
  }
}