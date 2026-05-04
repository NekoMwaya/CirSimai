export function buildNetlist(components, wires) {
  let netCounter = 1;
  const nets = {}; 
  const pinToNet = {}; // "compId:pinId" -> netId

  const graph = {}; // "compId:pinId" -> Set of "compId:pinId"
  
  const addEdge = (node1, node2) => {
    if (!graph[node1]) graph[node1] = new Set();
    if (!graph[node2]) graph[node2] = new Set();
    graph[node1].add(node2);
    graph[node2].add(node1);
  };

  // Build connection graph
  wires.forEach(wire => {
    const node1 = `${wire.startComponent}:${wire.startPin}`;
    const node2 = `${wire.endComponent}:${wire.endPin}`;
    addEdge(node1, node2);
  });

  const visited = new Set();

  // Find connected components (nets)
  Object.keys(graph).forEach(node => {
    if (!visited.has(node)) {
      const netId = `net-${netCounter++}`;
      nets[netId] = [];
      
      const queue = [node];
      visited.add(node);

      while(queue.length > 0) {
        const curr = queue.shift();
        const [comp, pin] = curr.split(':');
        nets[netId].push({ comp, pin });
        pinToNet[curr] = netId;

        graph[curr].forEach(neighbor => {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        });
      }
    }
  });

  return {
    components: components.map(c => ({ id: c.id, type: c.type })),
    nets,
    pinToNet,
  };
}
