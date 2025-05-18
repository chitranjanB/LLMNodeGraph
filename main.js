// Create mind map using factory
const mindMap = MindMapModule.MindMapFactory.createRadialMindMap({
    svgSelector: "svg",
    width: 800,
    height: 400,
    styleConfig: {
        nodeFill: "#ffffff",
        nodeStroke: "#007bff"
    }
});

// Example: Adding nodes
mindMap.addNode("Root", "ReactJs");
mindMap.addNode("Root", "AngularJs");
mindMap.addNode("ReactJs", "JSX");
mindMap.addNode("ReactJs", "React Context");
mindMap.addNode("AngularJs", "What is AngularJs");
mindMap.addNode("AngularJs", "Advantages");

// Subscribe to updates
mindMap.on("updated", ({ nodes, links }) => {
    console.log(`Mind map updated with ${nodes.length} nodes and ${links.length} links`);
});