class MindMap {
    constructor(svgSelector, width, height) {
        this.svg = d3.select(svgSelector);
        this.width = width;
        this.height = height;
        this.g = this.svg.append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);
        
        // Zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.5, 2])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform.translate(width / 2, height / 2));
            });
        this.svg.call(this.zoom);

        // Radial tree layout
        this.tree = d3.tree()
            .size([2 * Math.PI, Math.min(width, height) / 2 - 100])
            .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

        this.data = { name: "Root", children: [] };
        this.root = d3.hierarchy(this.data);
        this.root.x0 = 0;
        this.root.y0 = 0;

        this.update();
    }

    addNode(parentName, newNodeName) {
        const findNode = (node, name) => {
            if (node.name === name) return node;
            if (node.children) {
                for (let child of node.children) {
                    const found = findNode(child, name);
                    if (found) return found;
                }
            }
            return null;
        };

        const parent = findNode(this.data, parentName);
        if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push({ name: newNodeName });
            this.root = d3.hierarchy(this.data);
            this.root.x0 = 0;
            this.root.y0 = 0;
            this.update();
        } else {
            console.error(`Parent node "${parentName}" not found`);
        }
    }

    update() {
        const treeData = this.tree(this.root);
        const nodes = treeData.descendants();
        const links = treeData.links();

        // Normalize for fixed depth
        nodes.forEach(d => {
            d.y = d.depth * 100; // Radial distance per level
        });

        // Links
        const link = this.g.selectAll(".link")
            .data(links, d => d.target.id);

        link.enter().append("path")
            .attr("class", "link")
            .merge(link)
            .attr("d", d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y));

        link.exit().remove();

        // Nodes
        const node = this.g.selectAll(".node")
            .data(nodes, d => d.id);

        const nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

        nodeEnter.append("circle")
            .attr("r", 5)
            .on("mouseover", function() { d3.select(this).attr("r", 7); })
            .on("mouseout", function() { d3.select(this).attr("r", 5); })
            .call(d3.drag()
                .on("start", (event, d) => {
                    d.x0 = d.x;
                    d.y0 = d.y;
                })
                .on("drag", (event, d) => {
                    d.x = event.x;
                    d.y = event.y;
                    this.update();
                }));

        nodeEnter.append("text")
            .attr("dy", ".31em")
            .attr("x", d => d.x < Math.PI === !d.children ? 8 : -8)
            .style("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
            .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
            .text(d => d.data.name);

        node.merge(nodeEnter)
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

        node.exit().remove();
    }
}