export class BaseModel {
  constructor(id, engine) {
    this.id = id;
    this.engine = engine;
  }

  // Called by the engine when a net attached to this component changes state
  // eslint-disable-next-line no-unused-vars
  onNetChange(pinId, isHigh) {
    // Override in subclasses
  }

  // Pushes a UI update back to the main thread
  updateUI(updates) {
    self.postMessage({ type: 'STATE', id: this.id, updates });
  }

  // Optional: Called in the engine loop for components that have active processing (like MCUs)
  execute() {
    // Override in subclasses
  }

  stop() {
    // Clean up if necessary
  }
}