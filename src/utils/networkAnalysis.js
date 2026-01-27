import { getPins } from './math';

const coordId = (x, y) => `${Math.round(x)},${Math.round(y)}`;

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
    wires.forEach(w => {
        const id1 = coordId(w.points[0], w.points[1]);
        const id2 = coordId(w.points[2], w.points[3]);
        connect(id1, id2);
        
        // Also connect wire endpoints to any component pins they're close to (within 5 pixels)
        // This handles slight misalignments
        const tolerance = 5;
        componentPins.forEach(pin => {
            if (Math.abs(w.points[0] - pin.x) <= tolerance && Math.abs(w.points[1] - pin.y) <= tolerance) {
                connect(id1, pin.id);
            }
            if (Math.abs(w.points[2] - pin.x) <= tolerance && Math.abs(w.points[3] - pin.y) <= tolerance) {
                connect(id2, pin.id);
            }
        });
    });

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
                 const gndKey = coordId(pins[0].x, pins[0].y);
                 
                 // If that pin is part of the graph (it should be)
                 if (adj.has(gndKey)) {
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
        } else if (c.type === 'source') {
            prefix = "V";
            if (!c.value) value = "5";
            value = `DC ${value}`;
            probe = `${spiceName}#branch`; 
        }

        const name = spiceName;
        
        // For voltage sources, swap node order: SPICE expects V name n+ n-
        // Visual: pin1 (left, x=-40) is negative, pin2 (right, x=40) is positive
        // So we write: V1 n2 n1 (positive node first)
        if (c.type === 'source') {
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
    // Also include .TRAN for time-domain analysis if needed
    netlist += ".OP\n";
    netlist += ".TRAN 10ms 1s\n";
    if (probes.length > 0) {
        netlist += `.PRINT TRAN ${probes.join(' ')}\n`;
    }
    netlist += ".END";

    return { netlist, nodeMap, nodeLocations, componentMap };
};