import { getPins } from './math';

const coordId = (x, y) => `${Math.round(x)},${Math.round(y)}`;

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

/**
 * Generates a SPICE Netlist and handles internal mapping.
 * @returns {Object} { netlist, nodeMap, nodeLocations, componentMap }
 */
export const generateNetlist = (components, wires) => {
    // 1. Connectivity Graph - using Sets to avoid duplicate edges
    const adj = new Map(); 
    
    const ensureNode = (id) => {
        if (!adj.has(id)) adj.set(id, new Set());
    };
    
    const connect = (id1, id2) => {
        ensureNode(id1);
        ensureNode(id2);
        adj.get(id1).add(id2);
        adj.get(id2).add(id1);
    };

    // Collect all component pins with their coordIds
    const componentPins = [];
    components.forEach(c => getPins(c).forEach(p => {
        const id = coordId(p.x, p.y);
        ensureNode(id);
        componentPins.push({ x: p.x, y: p.y, id });
    }));

    // Add wire connections
    // First, collect all wire endpoints
    const wireEndpoints = [];
    wires.forEach(w => {
        const id1 = coordId(w.points[0], w.points[1]);
        const id2 = coordId(w.points[2], w.points[3]);
        wireEndpoints.push({ x: w.points[0], y: w.points[1], id: id1 });
        wireEndpoints.push({ x: w.points[2], y: w.points[3], id: id2 });
        connect(id1, id2);
    });
    
    // Connect wire endpoints that are at the same position (junctions)
    // This ensures T-junctions and wire crossings are properly connected
    const endpointGroups = new Map();
    wireEndpoints.forEach(ep => {
        if (!endpointGroups.has(ep.id)) {
            endpointGroups.set(ep.id, []);
        }
        endpointGroups.get(ep.id).push(ep);
    });
    
    // Connect wire endpoints to component pins (exact match first, then tolerance)
    const tolerance = 5;
    componentPins.forEach(pin => {
        // Exact match - connect if wire endpoint has same coordId as component pin
        if (endpointGroups.has(pin.id)) {
            // Already connected via coordId matching
        }
        
        // Tolerance-based matching for slight misalignments
        wireEndpoints.forEach(ep => {
            if (Math.abs(ep.x - pin.x) <= tolerance && Math.abs(ep.y - pin.y) <= tolerance) {
                connect(ep.id, pin.id);
            }
        });
    });
    
    // Also connect wire endpoints that are close to each other (within tolerance)
    // This handles cases where snapping didn't work perfectly
    for (let i = 0; i < wireEndpoints.length; i++) {
        for (let j = i + 1; j < wireEndpoints.length; j++) {
            const ep1 = wireEndpoints[i];
            const ep2 = wireEndpoints[j];
            if (ep1.id !== ep2.id && 
                Math.abs(ep1.x - ep2.x) <= tolerance && 
                Math.abs(ep1.y - ep2.y) <= tolerance) {
                connect(ep1.id, ep2.id);
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
                 
                 // Ensure ground is connected to any nearby wire endpoints
                 // This handles cases where ground isn't directly wired but is close enough
                 wireEndpoints.forEach(ep => {
                     if (Math.abs(ep.x - gndPin.x) <= tolerance && 
                         Math.abs(ep.y - gndPin.y) <= tolerance) {
                         connect(ep.id, gndKey);
                     }
                 });
                 
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
    
    // Track if we have any BJTs to add model definitions
    const hasNpnBjt = components.some(c => c.type === 'bjt_npn');
    const hasPnpBjt = components.some(c => c.type === 'bjt_pnp');
    
    // Add BJT model definitions if needed (accurate datasheet parameters)
    if (hasNpnBjt) {
        netlist += ".MODEL 2N2222 NPN (IS=14.34f XTI=3 EG=1.11 VAF=74.03 BF=255.9 NE=1.307 ISE=14.34f IKF=.2847 XTB=1.5 BR=6.092 NC=2 ISC=0 IKR=0 RC=1 CJC=7.306p MJC=.3416 VJC=.75 FC=.5 CJE=22.01p MJE=.377 VJE=.75 TR=46.91n TF=411.1p ITF=.6 VTF=1.7 XTF=3 RB=10)\n";
        netlist += ".MODEL 2N3904 NPN (IS=6.734f XTI=3 EG=1.11 VAF=74.03 BF=416.4 NE=1.259 ISE=6.734f IKF=66.78m XTB=1.5 BR=.7371 NC=2 ISC=0 IKR=0 RC=1 CJC=3.638p MJC=.3085 VJC=.75 FC=.5 CJE=4.493p MJE=.2593 VJE=.75 TR=239.5n TF=301.2p ITF=.4 VTF=4 XTF=2 RB=10)\n";
    }
    if (hasPnpBjt) {
        netlist += ".MODEL 2N2907 PNP (IS=650.6E-18 XTI=3 EG=1.11 VAF=115.7 BF=231.7 NE=1.829 ISE=54.81f IKF=.3019 XTB=1.5 BR=3.563 NC=2 ISC=0 IKR=0 RC=.715 CJC=14.57p MJC=.5383 VJC=.75 FC=.5 CJE=20.15p MJE=.4167 VJE=.75 TR=111.4n TF=603.7p ITF=.65 VTF=5 XTF=1.7 RB=10)\n";
        netlist += ".MODEL 2N3906 PNP (IS=1.41f XTI=3 EG=1.11 VAF=18.7 BF=180.7 NE=1.5 ISE=0 IKF=80m XTB=1.5 BR=4.977 NC=2 ISC=0 IKR=0 RC=2.5 CJC=9.728p MJC=.5776 VJC=.75 FC=.5 CJE=8.063p MJE=.3677 VJE=.75 TR=33.42n TF=179.3p ITF=.4 VTF=4 XTF=6 RB=10)\n";
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
        } else if (c.type === 'bjt_npn' || c.type === 'bjt_pnp') {
            // BJT: Q<name> <collector> <base> <emitter> <model>
            // pins: [0]=Base, [1]=Collector, [2]=Emitter
            const nBase = n1;
            const nCollector = n2;
            const nEmitter = nodeMap.get(coordId(pins[2].x, pins[2].y)) ?? 0;
            
            const modelName = c.value || (c.type === 'bjt_npn' ? '2N2222' : '2N2907');
            
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
    
    if (acSources.length > 0) {
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