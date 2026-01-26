import { getPins } from './math';

const coordId = (x, y) => `${Math.round(x)},${Math.round(y)}`;

/**
 * Generates a SPICE Netlist and handles internal mapping.
 * @returns {Object} { netlist, nodeMap, nodeLocations, componentMap }
 */
export const generateNetlist = (components, wires) => {
    // 1. Connectivity Graph
    const adj = new Map(); 
    const connect = (x1, y1, x2, y2) => {
        const id1 = coordId(x1, y1);
        const id2 = coordId(x2, y2);
        if (!adj.has(id1)) adj.set(id1, []);
        if (!adj.has(id2)) adj.set(id2, []);
        adj.get(id1).push(id2);
        adj.get(id2).push(id1);
    };

    wires.forEach(w => connect(w.points[0], w.points[1], w.points[2], w.points[3]));
    components.forEach(c => getPins(c).forEach(p => {
        const id = coordId(p.x, p.y);
        if (!adj.has(id)) adj.set(id, []);
    }));

    // 2. Node Assignment
    const visited = new Set();
    const nodeMap = new Map(); 
    const nodeLocations = {}; 
    let nodeCounter = 0;

    // Automatic Grounding
    const sourceComp = components.find(c => c.type === 'source');
    if (sourceComp) {
        const pins = getPins(sourceComp);
        if (pins.length >= 2) {
            const gndKey = coordId(pins[1].x, pins[1].y);
            if (adj.has(gndKey)) {
                 const stack = [gndKey];
                 while (stack.length > 0) {
                     const curr = stack.pop();
                     if (visited.has(curr)) continue;
                     visited.add(curr);
                     nodeMap.set(curr, 0);
                     if (!nodeLocations[0]) nodeLocations[0] = { x: parseInt(curr.split(',')[0]), y: parseInt(curr.split(',')[1]) };
                     (adj.get(curr) || []).forEach(n => stack.push(n));
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
                (adj.get(curr) || []).forEach(n => stack.push(n));
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
        netlist += `${name} ${n1} ${n2} ${value}\n`;

        // Store mapping so App can find it later
        if (probe) {
             componentMap[c.id] = { name, probe };
             probes.push(probe);
        }
    });

    // 4. Append Analysis Commands
// ...existing code...

    // 4. Append Analysis Commands
    // We explicitly generate the .TRAN and .PRINT command here to include our custom probes
    // Note: We use a short transient to basically get a DC point for now + graphable curve if sources vary
    netlist += ".TRAN 10ms 1s\n";
    if (probes.length > 0) {
        netlist += `.PRINT TRAN ${probes.join(' ')}\n`;
    }
    netlist += ".END";

    return { netlist, nodeMap, nodeLocations, componentMap };
};