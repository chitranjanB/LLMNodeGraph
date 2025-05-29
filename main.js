// Fetch the JSON data and initialize the mind map
fetch('data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load data.json');
        }
        return response.json();
    })
    .then(data => {
        const mindMap = MindMapModule.MindMapFactory.createRadialMindMap({
            svgSelector: "svg",
            width: 800,
            height: 400,
            styleConfig: {
                nodeFill: "#ffffff",
                nodeStroke: "#007bff"
            },
            data: data
        });

        mindMap.on("updated", ({ nodes, links }) => {
            console.log(`Mind map updated with ${nodes.length} nodes and ${links.length} links`);
        });
    })
    .catch(error => {
        console.error('Error loading mind map data:', error);
    });