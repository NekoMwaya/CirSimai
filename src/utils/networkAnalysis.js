import { getPins } from './math';
import { layoutCellFromCanvas, normalizeRotationDegrees } from './aiLayoutGrid';

const coordId = (x, y) => `${Math.round(x)},${Math.round(y)}`;

export const buildLayoutAnnotatedNetlist = (components, netlistText) => {
    const source = String(netlistText || '');
    if (!source.trim()) return source;

    const layoutLines = components
        .filter(c => c?.type !== 'ground' && c?.label)
        .map(c => {
            const { col, row } = layoutCellFromCanvas(c.x, c.y);
            const rotation = normalizeRotationDegrees(c.rotation);
            return `* [LAYOUT] ${String(c.label).trim()} C=${col} R=${row} ROT=${rotation}`;
        });

    if (layoutLines.length === 0) return source;

    const lines = source.split('\n');
    if (lines[0].trim().startsWith('*')) {
        return [lines[0], ...layoutLines, ...lines.slice(1)].join('\n');
    }
    return [...layoutLines, ...lines].join('\n');
};

/**
 * Parse engineering notation (e.g., "1k" -> 1000, "10u" -> 0.00001)
 */
const parseEngValue = (str) => {
    if (!str) return 0;
    str = String(str).trim().toUpperCase();
    const multipliers = {
        'T': 1e12, 'G': 1e9, 'MEG': 1e6, 'K': 1e3,
        'M': 1e-3, 'U': 1e-6, 'N': 1e-9, 'P': 1e-12, 'F': 1e-15
    };
    
    // Try to match number + suffix
    const match = str.match(/^([\d.]+)\s*([A-Z]*)$/);
    if (match) {
        const num = parseFloat(match[1]);
        const suffix = match[2];
        if (suffix && multipliers[suffix]) {
            return num * multipliers[suffix];
        }
        return num;
    }
    return parseFloat(str) || 0;
};

const isIdealModel = (value, prefix) => {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === prefix || normalized.startsWith(`${prefix}_`);
};

const resolveIdealModelName = (value, prefix, label) => {
    const raw = String(value || '').trim();
    if (!raw) return `${prefix}_${label}`;

    if (raw.toUpperCase() === prefix) {
        return `${prefix}_${label}`;
    }

    return raw;
};

const isPointOnWire = (px, py, x1, y1, x2, y2, tolerance = 5) => {
    // Check bounding box with tolerance
    const minX = Math.min(x1, x2) - tolerance;
    const maxX = Math.max(x1, x2) + tolerance;
    const minY = Math.min(y1, y2) - tolerance;
    const maxY = Math.max(y1, y2) + tolerance;
    
    if (px < minX || px > maxX || py < minY || py > maxY) return false;

    // If practically a point
    if (Math.abs(x1 - x2) < tolerance && Math.abs(y1 - y2) < tolerance) {
        return Math.hypot(px - x1, py - y1) < tolerance;
    }

    // Distance to segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    
    // Projection t = ((px-x1)(x2-x1) + (py-y1)(y2-y1)) / lengthSq
    // Clamp t to [0,1] for segment
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    const dist = Math.hypot(px - projX, py - projY);
    return dist <= tolerance;
};

/**
 * Generates a SPICE Netlist and handles internal mapping.
 * @param {Array} components - Circuit components
 * @param {Array} wires - Wire connections
 * @param {Object} options - Optional simulation parameters
 * @param {number} options.tranEndTime - Transient analysis end time in seconds
 * @returns {Object} { netlist, nodeMap, nodeLocations, componentMap }
 */
export const generateNetlist = (components, wires, options = {}) => {
    const { tranEndTime } = options;
    const hasStrictConnectivity = wires.some(w => w?.strictConnectivity === true);
    
    // 1. Connectivity Graph - using Sets to avoid duplicate edges
    const adj = new Map(); 
    
    const ensureNode = (id) => {
        if (!adj.has(id)) adj.set(id, new Set());
    };
    
    const connect = (id1, id2) => {
        if (id1 === id2) return;
        ensureNode(id1);
        ensureNode(id2);
        adj.get(id1).add(id2);
        adj.get(id2).add(id1);
    };

    // Collect all "Points of Interest" (Pins + Wire Ends)
    // Structure: { x, y, id }
    const pointsOfInterest = [];

    // 1a. Component Pins
    components.forEach(c => getPins(c).forEach(p => {
        const id = coordId(p.x, p.y);
        ensureNode(id);
        pointsOfInterest.push({ x: p.x, y: p.y, id });
    }));

    // 1b. Wire Endpoints (add them to start graph)
    wires.forEach(w => {
        const id1 = coordId(w.points[0], w.points[1]);
        const id2 = coordId(w.points[2], w.points[3]);
        ensureNode(id1);
        ensureNode(id2);
        pointsOfInterest.push({ x: w.points[0], y: w.points[1], id: id1 });
        pointsOfInterest.push({ x: w.points[2], y: w.points[3], id: id2 });
    });

    // Strict points belong to Simple/LLM-generated wires and should not be proximity-merged.
    const strictPointIds = new Set();
    wires.forEach(w => {
        if (w?.strictConnectivity !== true) return;
        strictPointIds.add(coordId(w.points[0], w.points[1]));
        strictPointIds.add(coordId(w.points[2], w.points[3]));
    });

    const tolerance = 5;

    // 1c. Wire Segments Connectivity
    // Ideally wires connect any points that lie on them.
    wires.forEach(w => {
        const x1 = w.points[0], y1 = w.points[1];
        const x2 = w.points[2], y2 = w.points[3];

        // Strict mode wires are explicit endpoint connections only.
        if (w?.strictConnectivity === true) {
            connect(coordId(x1, y1), coordId(x2, y2));
            return;
        }

        // Find all points that lie on this wire
        const onWire = pointsOfInterest.filter(p => 
            isPointOnWire(p.x, p.y, x1, y1, x2, y2, tolerance)
        );

        // Sort them by distance from start of wire (x1, y1)
        // This ensures we connect them in order: p1-p2-p3...
        onWire.sort((a, b) => {
            const da = (a.x - x1) ** 2 + (a.y - y1) ** 2;
            const db = (b.x - x1) ** 2 + (b.y - y1) ** 2;
            return da - db;
        });

        // Connect sequential points
        for (let i = 0; i < onWire.length - 1; i++) {
            connect(onWire[i].id, onWire[i+1].id);
        }
    });

    // 1d. Co-located Points (Pin-to-Pin direct connection without wire)
    // This handles components placed directly on top of each other's pins
    for (let i = 0; i < pointsOfInterest.length; i++) {
        for (let j = i + 1; j < pointsOfInterest.length; j++) {
            const p1 = pointsOfInterest[i];
            const p2 = pointsOfInterest[j];

            // Never proximity-merge strict Simple/LLM points.
            if (strictPointIds.has(p1.id) || strictPointIds.has(p2.id)) {
                continue;
            }
            
            // Optimization: Only check if they are close
            if (Math.abs(p1.x - p2.x) <= tolerance && Math.abs(p1.y - p2.y) <= tolerance) {
                connect(p1.id, p2.id);
            }
        }
    }

   // 2. Node Assignment
    const visited = new Set();
    const nodeMap = new Map(); 
    const nodeLocations = {}; 
    let nodeCounter = 0;
    let hasExplicitGround = false;

    // Helper to get neighbors (works with Set)
    const getNeighbors = (key) => adj.get(key) || new Set();

    // Explicit Grounding (Look for 'ground' components)
    const groundComps = components.filter(c => c.type === 'ground');
    if (groundComps.length > 0) {
        hasExplicitGround = true;
        groundComps.forEach(g => {
             const pins = getPins(g);
             if (pins.length > 0) {
                 const gndPin = pins[0];
                 const gndKey = coordId(gndPin.x, gndPin.y);
                 
                 // Ensure ground is connected to any nearby points
                 // This handles cases where ground isn't directly wired but is close enough
                 if (!hasStrictConnectivity) {
                     pointsOfInterest.forEach(pt => {
                         if (Math.abs(pt.x - gndPin.x) <= tolerance && 
                             Math.abs(pt.y - gndPin.y) <= tolerance) {
                             connect(pt.id, gndKey);
                         }
                     });
                 }
                 
                 // If that pin is part of the graph and has connections
                 if (adj.has(gndKey) && adj.get(gndKey).size > 0) {
                     const stack = [gndKey];
                     while (stack.length > 0) {
                         const curr = stack.pop();
                         if (visited.has(curr)) {
                             // Already visited? Ensure it's marked as 0 if we reached it from a ground
                             if (nodeMap.get(curr) !== 0) {
                                 // Overwrite or conflict? For now, assume shorts are 0.
                                 nodeMap.set(curr, 0);
                             }
                             continue;
                         }
                         visited.add(curr);
                         nodeMap.set(curr, 0);
                         if (!nodeLocations[0]) nodeLocations[0] = { x: parseInt(curr.split(',')[0]), y: parseInt(curr.split(',')[1]) };
                         getNeighbors(curr).forEach(n => stack.push(n));
                     }
                 } else {
                     // Ground pin has no connections but still mark it as node 0
                     visited.add(gndKey);
                     nodeMap.set(gndKey, 0);
                     if (!nodeLocations[0]) nodeLocations[0] = { x: gndPin.x, y: gndPin.y };
                 }
             }
        });
    }

    // Auto-ground: If no explicit ground, use negative terminal of first voltage source
    // This matches LTspice behavior where a ground reference is required
    if (!hasExplicitGround) {
        const firstSource = components.find(c => c.type === 'source');
        if (firstSource) {
            const pins = getPins(firstSource);
            if (pins.length >= 2) {
                // Pin 0 (left) is negative terminal, Pin 1 (right) is positive terminal
                // Ground the negative terminal (pin 0)
                const negativeTerminalKey = coordId(pins[0].x, pins[0].y);
                
                if (adj.has(negativeTerminalKey)) {
                    const stack = [negativeTerminalKey];
                    while (stack.length > 0) {
                        const curr = stack.pop();
                        if (visited.has(curr)) continue;
                        visited.add(curr);
                        nodeMap.set(curr, 0);
                        if (!nodeLocations[0]) nodeLocations[0] = { x: parseInt(curr.split(',')[0]), y: parseInt(curr.split(',')[1]) };
                        getNeighbors(curr).forEach(n => stack.push(n));
                    }
                }
            }
        }
    }

    // Assign generic nodes
    for (const [posKey] of adj) {
        if (!visited.has(posKey)) {
            const currentNodeID = ++nodeCounter;
            const stack = [posKey];
            while (stack.length > 0) {
                const curr = stack.pop();
                if (visited.has(curr)) continue;
                visited.add(curr);
                nodeMap.set(curr, currentNodeID);
                if (!nodeLocations[currentNodeID]) nodeLocations[currentNodeID] = { x: parseInt(curr.split(',')[0]), y: parseInt(curr.split(',')[1]) };
                getNeighbors(curr).forEach(n => stack.push(n));
            }
        }
    }

    // 3. Generate Netlist & Parameter Mapping
    let netlist = "* Simple Circuit Simulation\n";
    const componentMap = {}; // Maps visual ID (string) -> { name: "R1", probe: "@r1[i]" }
    const probes = []; // List of things to print: "v(1)", "@r1[i]"
    const emittedModels = new Set();
    
    // Track transistor and diode types to add model definitions
    const hasNpnBjt = components.some(c => c.type === 'bjt_npn');
    const hasPnpBjt = components.some(c => c.type === 'bjt_pnp');
    const hasNmos = components.some(c => c.type === 'nmos');
    const hasPmos = components.some(c => c.type === 'pmos');
    const hasNjfet = components.some(c => c.type === 'njfet');
    const hasPjfet = components.some(c => c.type === 'pjfet');
    const hasIdealDiode = components.some(c => c.type === 'diode_ideal');
    const hasModelDiode = components.some(c => c.type === 'diode_model');
    
    // Add Diode model definitions
    if (hasIdealDiode) {
        // IDEAL diode: Models theoretical 0.7V forward voltage drop
        // IS calculated so that at IF=1mA, VF≈0.7V: IS = IF / (exp(VF/VT) - 1) ≈ 1e-14
        // N=1 for ideal diode equation, RS=0.001 (small resistance for numerical stability)
        netlist += ".MODEL IDEAL D (IS=1e-14 N=1 RS=0.001 BV=100 IBV=1e-10)\n";
    }
    if (hasModelDiode || hasIdealDiode) {
        // Realistic diode models from datasheets
        // 1N4148: Fast switching signal diode
        netlist += ".MODEL 1N4148 D (IS=2.52e-9 N=1.752 RS=0.568 BV=100 IBV=100u CJO=4p VJ=0.6 M=0.45 TT=6n)\n";
        // 1N4001: General purpose rectifier diode (1A, 50V)
        netlist += ".MODEL 1N4001 D (IS=29.5e-9 N=1.73 RS=0.042 BV=50 IBV=5u CJO=18p VJ=0.75 M=0.333 TT=5.7u)\n";
        // 1N4007: General purpose rectifier diode (1A, 1000V)
        netlist += ".MODEL 1N4007 D (IS=7.02e-9 N=1.77 RS=0.036 BV=1000 IBV=5u CJO=17.5p VJ=0.75 M=0.333 TT=4.3u)\n";
        // 1N5819: Schottky diode (1A, 40V) - lower forward voltage
        netlist += ".MODEL 1N5819 D (IS=31.7u N=1.016 RS=0.052 BV=40 IBV=1m CJO=110p VJ=0.34 M=0.35 TT=5n)\n";
        // Zener diodes
        netlist += ".MODEL 1N4733A D (IS=1e-14 N=1 RS=5 BV=5.1 IBV=1m)\n"; // 5.1V Zener
        netlist += ".MODEL 1N4742A D (IS=1e-14 N=1 RS=7 BV=12 IBV=1m)\n"; // 12V Zener
    }
    
    // Add BJT model definitions (ideal + realistic)
    // For IDEAL models, we generate per-component models with custom beta values
    if (hasNpnBjt) {
        // Realistic models from datasheets (fixed)
        netlist += ".MODEL 2N2222 NPN (IS=14.34f XTI=3 EG=1.11 VAF=74.03 BF=255.9 NE=1.307 ISE=14.34f IKF=.2847 XTB=1.5 BR=6.092 NC=2 ISC=0 IKR=0 RC=1 CJC=7.306p MJC=.3416 VJC=.75 FC=.5 CJE=22.01p MJE=.377 VJE=.75 TR=46.91n TF=411.1p ITF=.6 VTF=1.7 XTF=3 RB=10)\n";
        netlist += ".MODEL 2N3904 NPN (IS=6.734f XTI=3 EG=1.11 VAF=74.03 BF=416.4 NE=1.259 ISE=6.734f IKF=66.78m XTB=1.5 BR=.7371 NC=2 ISC=0 IKR=0 RC=1 CJC=3.638p MJC=.3085 VJC=.75 FC=.5 CJE=4.493p MJE=.2593 VJE=.75 TR=239.5n TF=301.2p ITF=.4 VTF=4 XTF=2 RB=10)\n";
    }
    if (hasPnpBjt) {
        // Realistic models from datasheets (fixed)
        netlist += ".MODEL 2N2907 PNP (IS=650.6E-18 XTI=3 EG=1.11 VAF=115.7 BF=231.7 NE=1.829 ISE=54.81f IKF=.3019 XTB=1.5 BR=3.563 NC=2 ISC=0 IKR=0 RC=.715 CJC=14.57p MJC=.5383 VJC=.75 FC=.5 CJE=20.15p MJE=.4167 VJE=.75 TR=111.4n TF=603.7p ITF=.65 VTF=5 XTF=1.7 RB=10)\n";
        netlist += ".MODEL 2N3906 PNP (IS=1.41f XTI=3 EG=1.11 VAF=18.7 BF=180.7 NE=1.5 ISE=0 IKF=80m XTB=1.5 BR=4.977 NC=2 ISC=0 IKR=0 RC=2.5 CJC=9.728p MJC=.5776 VJC=.75 FC=.5 CJE=8.063p MJE=.3677 VJE=.75 TR=33.42n TF=179.3p ITF=.4 VTF=4 XTF=6 RB=10)\n";
    }
    
    // Generate IDEAL BJT models with custom beta.
    // Supports both generic values (IDEAL_NPN) and explicit names (IDEAL_NPN_Q1).
    components.filter(c => c.type === 'bjt_npn' && isIdealModel(c.value, 'IDEAL_NPN')).forEach(c => {
        const beta = c.beta ?? 100;
        const modelName = resolveIdealModelName(c.value, 'IDEAL_NPN', c.label);
        if (emittedModels.has(modelName)) return;
        netlist += `.MODEL ${modelName} NPN (IS=1e-14 BF=${beta} VAF=1000 VJE=0.7)\n`;
        emittedModels.add(modelName);
    });
    components.filter(c => c.type === 'bjt_pnp' && isIdealModel(c.value, 'IDEAL_PNP')).forEach(c => {
        const beta = c.beta ?? 100;
        const modelName = resolveIdealModelName(c.value, 'IDEAL_PNP', c.label);
        if (emittedModels.has(modelName)) return;
        netlist += `.MODEL ${modelName} PNP (IS=1e-14 BF=${beta} VAF=1000 VJE=0.7)\n`;
        emittedModels.add(modelName);
    });
    
    // Add MOSFET model definitions
    if (hasNmos) {
        // Realistic models (fixed)
        netlist += ".MODEL 2N7000 NMOS (VTO=2.0 KP=30m LAMBDA=0.04 RD=1 RS=1 CBD=40p CBS=40p)\n";
        netlist += ".MODEL BS170 NMOS (VTO=1.5 KP=50m LAMBDA=0.03 RD=0.5 RS=0.5 CBD=60p CBS=60p)\n";
    }
    if (hasPmos) {
        // Realistic models (fixed)
        netlist += ".MODEL BS250 PMOS (VTO=-3.0 KP=12m LAMBDA=0.03 RD=1 RS=1 CBD=100p CBS=100p)\n";
        netlist += ".MODEL VP2106 PMOS (VTO=-2.5 KP=15m LAMBDA=0.025)\n";
    }
    
    // Generate IDEAL MOSFET models with custom Vth and KP derived from Id(on)@Vgs(on).
    components.filter(c => c.type === 'nmos' && isIdealModel(c.value, 'IDEAL_NMOS')).forEach(c => {
        const vth = c.vth ?? 1;
        const id_on = (c.id_on ?? 2) / 1000; // mA to A
        const vgs_on = c.vgs_on ?? 10;
        
        // Calculate KP: Id = (KP/2) * (Vgs - Vth)^2  =>  KP = 2*Id / (Vgs - Vth)^2
        // Protect against divide by zero or calculating absurd values
        let kp = 2e-3; // Default 2m
        if (Math.abs(vgs_on - vth) > 0.1) {
            kp = (2 * id_on) / Math.pow(vgs_on - vth, 2);
        }

        const modelName = resolveIdealModelName(c.value, 'IDEAL_NMOS', c.label);
        if (emittedModels.has(modelName)) return;
        netlist += `.MODEL ${modelName} NMOS (VTO=${vth} KP=${kp} LAMBDA=0.01)\n`;
        emittedModels.add(modelName);
    });
    components.filter(c => c.type === 'pmos' && isIdealModel(c.value, 'IDEAL_PMOS')).forEach(c => {
        const vth = c.vth ?? -1;
        const id_on = (c.id_on ?? 2) / 1000; // mA to A
        const vgs_on = c.vgs_on ?? -10;
        
        // For PMOS, use magnitudes for calculation to be safe
        let kp = 1e-3; // Default 1m
        if (Math.abs(Math.abs(vgs_on) - Math.abs(vth)) > 0.1) {
             kp = (2 * id_on) / Math.pow(Math.abs(vgs_on) - Math.abs(vth), 2);
        }

        const modelName = resolveIdealModelName(c.value, 'IDEAL_PMOS', c.label);
        if (emittedModels.has(modelName)) return;
        netlist += `.MODEL ${modelName} PMOS (VTO=${vth} KP=${kp} LAMBDA=0.01)\n`;
        emittedModels.add(modelName);
    });
    
    // Add JFET model definitions
    if (hasNjfet) {
        // Realistic models (fixed)
        netlist += ".MODEL 2N5457 NJF (VTO=-1.5 BETA=1.3m LAMBDA=0.01 RD=1 RS=1 CGD=2p CGS=2p)\n";
        netlist += ".MODEL J201 NJF (VTO=-0.8 BETA=0.7m LAMBDA=0.008)\n";
    }
    if (hasPjfet) {
        // Realistic models (fixed)
        netlist += ".MODEL 2N5460 PJF (VTO=2.5 BETA=0.5m LAMBDA=0.012 RD=1 RS=1 CGD=3p CGS=3p)\n";
        netlist += ".MODEL J175 PJF (VTO=4.0 BETA=0.3m LAMBDA=0.01)\n";
    }
    
    // Generate IDEAL JFET models with custom Vp.
    components.filter(c => c.type === 'njfet' && isIdealModel(c.value, 'IDEAL_NJFET')).forEach(c => {
        const vp = c.vp ?? -2;
        const idss = (c.idss ?? 10) / 1000; // Convert mA to A
        const beta = idss / (Math.pow(vp, 2));
        const modelName = resolveIdealModelName(c.value, 'IDEAL_NJFET', c.label);
        if (emittedModels.has(modelName)) return;
        netlist += `.MODEL ${modelName} NJF (VTO=${vp} BETA=${beta} LAMBDA=0.01)\n`;
        emittedModels.add(modelName);
    });
    components.filter(c => c.type === 'pjfet' && isIdealModel(c.value, 'IDEAL_PJFET')).forEach(c => {
        const vp = c.vp ?? 2;
        const idss = (c.idss ?? 5) / 1000; // Convert mA to A
        const beta = idss / (Math.pow(vp, 2));
        const modelName = resolveIdealModelName(c.value, 'IDEAL_PJFET', c.label);
        if (emittedModels.has(modelName)) return;
        netlist += `.MODEL ${modelName} PJF (VTO=${vp} BETA=${beta} LAMBDA=0.01)\n`;
        emittedModels.add(modelName);
    });
    
    // Check for op-amps
    const hasOpamp = components.some(c => c.type === 'opamp' || c.type === 'opamp5');
    
    // Add op-amp subcircuit definitions
    // Op-amps in ngspice are modeled as subcircuits with controlled sources
    if (hasOpamp) {
        // Generate IDEAL OPAMP models with custom Aol, Zin, Zout.
        components.filter(c => (c.type === 'opamp' || c.type === 'opamp5') && isIdealModel(c.value, 'IDEAL_OPAMP')).forEach(c => {
            const aol = c.aol ?? 100000;
            // For Zin and Zout, handle potential suffixes or default values
            // Default Zin = 10Meg, Zout = 0 (Ideal)
            const zinProp = c.zin !== undefined ? c.zin : "10Meg"; 
            const zoutProp = c.zout !== undefined ? c.zout : "0";
            
            // Parse for 0 check
            // If Zout is effectively 0, we can use the simple model or just use very small resistance
            // Spice resistors can't be exactly 0 usually.
            
            const modelName = resolveIdealModelName(c.value, 'IDEAL_OPAMP', c.label);
            if (emittedModels.has(modelName)) return;
            netlist += `* Custom Ideal Op-Amp for ${c.label}\n`;
            netlist += `.SUBCKT ${modelName} inp inm out\n`;
            netlist += `Rin inp inm ${zinProp}\n`;
            
            // Output modeling with Output Impedance
            // Egain generates voltage based on input. We put it on an internal node.
            // Then Rout connects internal node to output.
            if (zoutProp === "0" || zoutProp === 0 || zoutProp === "0.0") {
                 netlist += `Egain out 0 inp inm ${aol}\n`;
            } else {
                 netlist += `Egain int_out 0 inp inm ${aol}\n`;
                 netlist += `Rout int_out out ${zoutProp}\n`;
            }
            netlist += `.ENDS ${modelName}\n`;
            emittedModels.add(modelName);
        });
        
        // LM741: Classic general-purpose op-amp (simplified model)
        netlist += ".SUBCKT LM741 inp inm out\n";
        netlist += "Rin inp inm 2Meg\n";
        netlist += "Egain out 0 inp inm 200k\n";
        netlist += "Rout out 0 75\n";
        netlist += ".ENDS LM741\n";
        
        // TL072: Low-noise JFET-input op-amp
        netlist += ".SUBCKT TL072 inp inm out\n";
        netlist += "Rin inp inm 1T\n";
        netlist += "Egain out 0 inp inm 200k\n";
        netlist += "Rout out 0 50\n";
        netlist += ".ENDS TL072\n";
        
        // LM358: Dual op-amp, single supply
        netlist += ".SUBCKT LM358 inp inm out\n";
        netlist += "Rin inp inm 1Meg\n";
        netlist += "Egain out 0 inp inm 100k\n";
        netlist += "Rout out 0 100\n";
        netlist += ".ENDS LM358\n";
    }

    // Add all nodes to print list first (v(1), v(2)...)
    // We sort specific node IDs to keep output somewhat deterministic
    const uniqueNodes = Array.from(new Set(nodeMap.values())).sort((a,b)=>a-b);
    uniqueNodes.forEach(n => {
        // SPICE 'v(0)' is always 0, sometimes invalid to print directly depending on engine, 
        // but typically v(node) is fine. We skip 0 usually as it is reference.
        if (n !== 0) probes.push(`v(${n})`);
    });

    components.forEach((c, index) => {
        const pins = getPins(c);
        if (pins.length < 2) return;

        const n1 = nodeMap.get(coordId(pins[0].x, pins[0].y)) ?? 0;
        const n2 = nodeMap.get(coordId(pins[1].x, pins[1].y)) ?? 0;

        let prefix = "R";
        let value = c.value || "1k";
        let probe = ""; 
        
        // FIX: Use the component's actual label for the Netlist name
        const spiceName = c.label || `${prefix}${index + 1}`; 

        if (c.type === 'resistor') {
            prefix = "R";
            if (!c.value) value = "1k";
            probe = `@${spiceName}[i]`; 
        } else if (c.type === 'capacitor') {
            prefix = "C";
            if (!c.value) value = "10u";
            probe = `@${spiceName}[i]`;
        } else if (c.type === 'inductor') {
            prefix = "L";
            if (!c.value) value = "1m";
            probe = `@${spiceName}[i]`;
        } else if (c.type === 'source') {
            prefix = "V";
            if (!c.value) value = "5";
            value = `DC ${value}`;
            probe = `${spiceName}#branch`; 
        } else if (c.type === 'acsource') {
            prefix = "V";
            // AC source value format: "amplitude frequency" e.g., "5 1k" means 5V at 1kHz
            const acParams = (c.value || "5 1k").split(' ');
            const amplitude = acParams[0] || "5";
            const freqStr = acParams[1] || "1k";
            // Parse frequency to numeric Hz value for SPICE
            const freqHz = parseEngValue(freqStr);
            // SPICE SIN format: SIN(offset amplitude frequency delay damping)
            // Frequency must be in Hz as a number
            value = `SIN(0 ${amplitude} ${freqHz})`;
            probe = `${spiceName}#branch`;
        } else if (c.type === 'diode_ideal') {
            // Ideal Diode (Theoretical 0.7V drop): D<name> <anode> <cathode> <model>
            // pins: [0]=Anode (left), [1]=Cathode (right)
            const modelName = 'IDEAL'; // Always use IDEAL model for theoretical diode
            
            netlist += `${spiceName} ${n1} ${n2} ${modelName}\n`;
            
            // Store mapping for diode
            componentMap[c.id] = { 
                name: spiceName, 
                probe: `@${spiceName.toLowerCase()}[id]`, // diode current
                node1: n1,
                node2: n2,
                isDiode: true,
                isIdeal: true
            };
            probes.push(`@${spiceName.toLowerCase()}[id]`);
            return; // Skip the normal netlist line generation
        } else if (c.type === 'diode_model') {
            // Model Diode: D<name> <anode> <cathode> <model>
            // pins: [0]=Anode (left), [1]=Cathode (right)
            const modelName = c.value || '1N4148'; // Default to 1N4148 signal diode
            
            netlist += `${spiceName} ${n1} ${n2} ${modelName}\n`;
            
            // Store mapping for diode
            componentMap[c.id] = { 
                name: spiceName, 
                probe: `@${spiceName.toLowerCase()}[id]`, // diode current
                node1: n1,
                node2: n2,
                isDiode: true,
                isIdeal: false,
                model: modelName
            };
            probes.push(`@${spiceName.toLowerCase()}[id]`);
            return; // Skip the normal netlist line generation
        } else if (c.type === 'bjt_npn' || c.type === 'bjt_pnp') {
            // BJT: Q<name> <collector> <base> <emitter> <model>
            // pins: [0]=Base, [1]=Collector, [2]=Emitter
            const nBase = n1;
            const nCollector = n2;
            const nEmitter = nodeMap.get(coordId(pins[2].x, pins[2].y)) ?? 0;
            
            let modelName = c.value || (c.type === 'bjt_npn' ? '2N2222' : '2N2907');
            // Use per-component model name for generic IDEAL values and preserve explicit names.
            if (isIdealModel(modelName, 'IDEAL_NPN')) {
                modelName = resolveIdealModelName(modelName, 'IDEAL_NPN', c.label);
            } else if (isIdealModel(modelName, 'IDEAL_PNP')) {
                modelName = resolveIdealModelName(modelName, 'IDEAL_PNP', c.label);
            }
            
            netlist += `${spiceName} ${nCollector} ${nBase} ${nEmitter} ${modelName}\n`;
            
            // Store mapping for BJT
            componentMap[c.id] = { 
                name: spiceName, 
                probe: `@${spiceName.toLowerCase()}[ic]`, // collector current
                node1: nBase,
                node2: nCollector,
                node3: nEmitter,
                isBjt: true
            };
            probes.push(`@${spiceName.toLowerCase()}[ic]`);
            probes.push(`@${spiceName.toLowerCase()}[ib]`);
            return; // Skip the normal netlist line generation
        } else if (c.type === 'nmos' || c.type === 'pmos') {
            // MOSFET: M<name> <drain> <gate> <source> <body> <model>
            // pins: [0]=Gate (left), [1]=Drain (top-right), [2]=Source (bottom-right)
            const nGate = n1;
            const nDrain = n2;
            const nSource = nodeMap.get(coordId(pins[2].x, pins[2].y)) ?? 0;
            // Body connected to source for simple 3-terminal usage
            const nBody = nSource;
            
            const defaultModel = c.type === 'nmos' ? 'IDEAL_NMOS' : 'IDEAL_PMOS';
            let modelName = c.value || defaultModel;
            // Use per-component model name for generic IDEAL values and preserve explicit names.
            if (isIdealModel(modelName, 'IDEAL_NMOS')) {
                modelName = resolveIdealModelName(modelName, 'IDEAL_NMOS', c.label);
            } else if (isIdealModel(modelName, 'IDEAL_PMOS')) {
                modelName = resolveIdealModelName(modelName, 'IDEAL_PMOS', c.label);
            }
            
            netlist += `${spiceName} ${nDrain} ${nGate} ${nSource} ${nBody} ${modelName}\n`;
            
            // Store mapping for MOSFET
            componentMap[c.id] = { 
                name: spiceName, 
                probe: `@${spiceName.toLowerCase()}[id]`, // drain current
                node1: nGate,
                node2: nDrain,
                node3: nSource,
                isMosfet: true
            };
            probes.push(`@${spiceName.toLowerCase()}[id]`);
            return; // Skip the normal netlist line generation
        } else if (c.type === 'njfet' || c.type === 'pjfet') {
            // JFET: J<name> <drain> <gate> <source> <model>
            // pins: [0]=Gate (left), [1]=Drain (top-right), [2]=Source (bottom-right)
            const nGate = n1;
            const nDrain = n2;
            const nSource = nodeMap.get(coordId(pins[2].x, pins[2].y)) ?? 0;
            
            const defaultModel = c.type === 'njfet' ? 'IDEAL_NJFET' : 'IDEAL_PJFET';
            let modelName = c.value || defaultModel;
            // Use per-component model name for generic IDEAL values and preserve explicit names.
            if (isIdealModel(modelName, 'IDEAL_NJFET')) {
                modelName = resolveIdealModelName(modelName, 'IDEAL_NJFET', c.label);
            } else if (isIdealModel(modelName, 'IDEAL_PJFET')) {
                modelName = resolveIdealModelName(modelName, 'IDEAL_PJFET', c.label);
            }
            
            netlist += `${spiceName} ${nDrain} ${nGate} ${nSource} ${modelName}\n`;
            
            // Store mapping for JFET
            componentMap[c.id] = { 
                name: spiceName, 
                probe: `@${spiceName.toLowerCase()}[id]`, // drain current
                node1: nGate,
                node2: nDrain,
                node3: nSource,
                isJfet: true
            };
            probes.push(`@${spiceName.toLowerCase()}[id]`);
            return; // Skip the normal netlist line generation
        } else if (c.type === 'opamp') {
            // Op-Amp (3-pin): X<name> <inp> <inm> <out> <model>
            // pins: [0]=V+ (non-inverting), [1]=V- (inverting), [2]=Output
            const nInPlus = n1;
            const nInMinus = n2;
            const nOut = nodeMap.get(coordId(pins[2].x, pins[2].y)) ?? 0;
            
            let modelName = c.value || 'IDEAL_OPAMP';
            // Use per-component model name for generic IDEAL values and preserve explicit names.
            if (isIdealModel(modelName, 'IDEAL_OPAMP')) {
                modelName = resolveIdealModelName(modelName, 'IDEAL_OPAMP', c.label);
            }
            
            // Use X prefix for subcircuit instantiation
            netlist += `X${spiceName} ${nInPlus} ${nInMinus} ${nOut} ${modelName}\n`;
            
            // Store mapping for op-amp
            componentMap[c.id] = { 
                name: `X${spiceName}`, 
                probe: null, // Op-amp doesn't have simple current probe
                node1: nInPlus,
                node2: nInMinus,
                node3: nOut,
                isOpamp: true
            };
            return; // Skip the normal netlist line generation
        } else if (c.type === 'opamp5') {
            // Op-Amp with power pins (5-pin): X<name> <inp> <inm> <out> <vcc+> <vcc-> <model>
            // pins: [0]=V+ input, [1]=V- input, [2]=Output, [3]=VCC+, [4]=VCC-
            const nInPlus = n1;
            const nInMinus = n2;
            const nOut = nodeMap.get(coordId(pins[2].x, pins[2].y)) ?? 0;
            const nVccPlus = nodeMap.get(coordId(pins[3].x, pins[3].y)) ?? 0;
            const nVccMinus = nodeMap.get(coordId(pins[4].x, pins[4].y)) ?? 0;
            
            let modelName = c.value || 'IDEAL_OPAMP';
            
            // Use the same model as 3-pin but ignore power pins for ideal model.
            if (isIdealModel(modelName, 'IDEAL_OPAMP')) {
                modelName = resolveIdealModelName(modelName, 'IDEAL_OPAMP', c.label);
            }
            
            netlist += `X${spiceName} ${nInPlus} ${nInMinus} ${nOut} ${modelName}\n`;
            
            // Store mapping for op-amp
            componentMap[c.id] = { 
                name: `X${spiceName}`, 
                probe: null,
                node1: nInPlus,
                node2: nInMinus,
                node3: nOut,
                node4: nVccPlus,
                node5: nVccMinus,
                isOpamp: true
            };
            return; // Skip the normal netlist line generation
        }

        const name = spiceName;
        
        // For voltage sources, swap node order: SPICE expects V name n+ n-
        // Visual: pin1 (left, x=-40) is negative, pin2 (right, x=40) is positive
        // So we write: V1 n2 n1 (positive node first)
        if (c.type === 'source' || c.type === 'acsource') {
            netlist += `${name} ${n2} ${n1} ${value}\n`;
        } else {
            netlist += `${name} ${n1} ${n2} ${value}\n`;
        }

        // Store mapping so App can find it later
        // Include node IDs for voltage drop calculation
        componentMap[c.id] = { 
            name, 
            probe: probe || null,
            node1: n1,  // First pin's node
            node2: n2   // Second pin's node
        };
        if (probe) {
            probes.push(probe);
        }
    });

    // 4. Append Analysis Commands
    // Use .OP for DC operating point analysis (matches LTspice .op behavior)
    netlist += ".OP\n";
    
    // Calculate appropriate TRAN parameters based on AC sources
    const acSources = components.filter(c => c.type === 'acsource');
    let tranStep = '1m';  // default 1ms step
    let tranTotal = '100m'; // default 100ms total
    
    // Use custom end time if provided, otherwise calculate from AC source frequency
    if (tranEndTime && tranEndTime > 0) {
        // User-specified end time
        const total = tranEndTime;
        
        // Calculate appropriate step size (aim for ~500 data points)
        const step = total / 500;
        
        // Format step for SPICE
        if (step < 1e-9) tranStep = `${(step * 1e12).toFixed(1)}p`;
        else if (step < 1e-6) tranStep = `${(step * 1e9).toFixed(1)}n`;
        else if (step < 1e-3) tranStep = `${(step * 1e6).toFixed(1)}u`;
        else if (step < 1) tranStep = `${(step * 1e3).toFixed(2)}m`;
        else tranStep = `${step.toFixed(3)}`;
        
        // Format total time for SPICE
        if (total < 1e-6) tranTotal = `${(total * 1e9).toFixed(1)}n`;
        else if (total < 1e-3) tranTotal = `${(total * 1e6).toFixed(1)}u`;
        else if (total < 1) tranTotal = `${(total * 1e3).toFixed(1)}m`;
        else tranTotal = `${total.toFixed(3)}`;
    } else if (acSources.length > 0) {
        // Find highest frequency AC source to determine time step
        let maxFreq = 0;
        acSources.forEach(ac => {
            const params = (ac.value || '5 1k').split(' ');
            const freq = parseEngValue(params[1] || '1k');
            if (freq > maxFreq) maxFreq = freq;
        });
        
        if (maxFreq > 0) {
            // Time step should be at least 1/50th of the period for smooth sine wave
            const period = 1 / maxFreq;
            const step = period / 50;
            // Total time: show at least 5 periods, max 1 second
            const total = Math.min(Math.max(period * 5, 0.01), 1);
            
            // Format for SPICE
            if (step < 1e-6) tranStep = `${(step * 1e9).toFixed(1)}n`;
            else if (step < 1e-3) tranStep = `${(step * 1e6).toFixed(1)}u`;
            else tranStep = `${(step * 1e3).toFixed(2)}m`;
            
            if (total < 1e-3) tranTotal = `${(total * 1e6).toFixed(1)}u`;
            else if (total < 1) tranTotal = `${(total * 1e3).toFixed(1)}m`;
            else tranTotal = `${total.toFixed(2)}`;
        }
    }
    
    netlist += `.TRAN ${tranStep} ${tranTotal}\n`;
    if (probes.length > 0) {
        netlist += `.PRINT TRAN ${probes.join(' ')}\n`;
    }
    netlist += ".END";

    return { netlist, nodeMap, nodeLocations, componentMap };
};