export class SpiceEngine {
  constructor() {
    this.outputBuffer = [];
    this.iframe = null;
    this.runId = 0;
  }

  async run(netlist) {
    this.outputBuffer = [];
    this.runId++;
    const currentRunId = this.runId;

    // Destroy previous iframe if exists
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }

    return new Promise((resolve, reject) => {
      // Create a hidden iframe to isolate the WASM runtime
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.sandbox = 'allow-scripts allow-same-origin';
      document.body.appendChild(iframe);
      this.iframe = iframe;

      const iframeWindow = iframe.contentWindow;
      const iframeDocument = iframe.contentDocument;

      // Prepare the netlist with analysis commands
      let finalNetlist = netlist;
      if (!finalNetlist.toLowerCase().includes('.op') && !finalNetlist.toLowerCase().includes('.tran')) {
        finalNetlist += '\n.TRAN 10ms 1s\n.PRINT TRAN ALL\n';
      }

      // Helper to cleanup this iframe/run before resolving
      const cleanupAndResolve = (value) => {
        try {
          if (iframe && iframe.parentNode) iframe.remove();
        } catch (e) {
          // ignore removal errors
        }
        if (this.iframe === iframe) this.iframe = null;
        resolve(value);
      };

      // Setup Module config in iframe context
      iframeWindow.outputBuffer = [];
      iframeWindow.Module = {
        noInitialRun: true,
        noExitRuntime: true,
        quit: () => {},
        print: (text) => {
          if (text && text.trim()) iframeWindow.outputBuffer.push(text);
        },
        printErr: (text) => {
          if (text && text.trim() && !text.includes('fopen')) {
            console.warn('[ngspice]', text);
          }
        },
        onRuntimeInitialized: () => {
          console.log('--- WASM KERNEL READY (iframe) ---');

          // Stale run check
          if (currentRunId !== this.runId) {
            cleanupAndResolve([]);
            return;
          }

          try {
            const FS = iframeWindow.FS || iframeWindow.Module.FS;
            const callMain = iframeWindow.callMain || iframeWindow.Module.callMain;

            if (!FS || !callMain) {
              cleanupAndResolve(['Error: WASM runtime not properly initialized']);
              return;
            }

            FS.writeFile('/circuit.cir', finalNetlist);
            console.log('--- RUNNING BATCH MODE (iframe) ---');

            try {
              callMain(['-b', '/circuit.cir']);
            } catch (e) {
              // Ignore ExitStatus, it's normal
              if (e.name !== 'ExitStatus' && !e.message?.includes('ExitStatus')) {
                console.warn('callMain exception:', e);
              }
            }

            // Give it a moment to flush output
            setTimeout(() => {
              this.outputBuffer = [...iframeWindow.outputBuffer];
              console.log('Simulation Output:', this.outputBuffer);
              cleanupAndResolve([...this.outputBuffer]);
            }, 150);

          } catch (e) {
            console.error('Simulation error:', e);
            cleanupAndResolve(['Error: ' + e.message]);
          }
        }
      };

      // Load ngspice.js in the iframe
      const baseUrl = import.meta.env.BASE_URL || '/';
      const scriptPath = `${baseUrl.replace(/\/$/, '')}/wasm/ngspice.js`;

      const script = iframeDocument.createElement('script');
      script.src = scriptPath;
      script.async = true;
      script.onerror = () => {
        console.error('Failed to load ngspice.js in iframe');
        cleanupAndResolve(['Error: Failed to load simulation engine']);
      };

      console.log(`Loading ngspice in iframe from ${scriptPath} ...`);
      iframeDocument.body.appendChild(script);

      // Timeout fallback
      const timeoutId = setTimeout(() => {
        if (currentRunId === this.runId && this.outputBuffer.length === 0) {
          cleanupAndResolve(['Error: Simulation timed out']);
        }
      }, 30000);

      // Ensure we clear timeout when promise resolves (best-effort)
      const originalResolve = resolve;
      resolve = (v) => {
        clearTimeout(timeoutId);
        originalResolve(v);
      };
    });
  }
}

export const spice = new SpiceEngine();