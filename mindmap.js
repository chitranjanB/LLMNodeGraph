class MindMap {
    constructor(svgSelector, width, height) {
        this.svg = d3.select(svgSelector);
        this.width = width;
        this.height = height;
        this.g = this.svg.append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);
        
        // Zoom behavior with smoother transitions
        this.zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform.translate(width / 2, height / 2));
            });
        this.svg.call(this.zoom).call(this.zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1));

        // Radial tree layout
        this.tree = d3.tree()
            .size([2 * Math.PI, Math.min(width, height) / 2 - 120])
            .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

        this.data = { name: "Root", children: [] };
        this.root = d3.hierarchy(this.data);
        this.root.x0 = 0;
        this.root.y0 = 0;
        this.selectedNode = null;

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
            d.y = d.depth * 110; // Slightly increased spacing
        });

        // Links
        const link = this.g.selectAll(".link")
            .data(links, d => d.target.id);

        link.enter().append("path")
            .attr("class", "link")
            .merge(link)
            .attr("d", d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y))
            .attr("stroke-dasharray", function() {
                const length = this.getTotalLength();
                return `${length} ${length}`;
            })
            .attr("stroke-dashoffset", function() {
                return this.getTotalLength();
            })
            .transition()
            .duration(500)
            .attr("stroke-dashoffset", 0);

        link.exit().remove();

        // Nodes
        const node = this.g.selectAll(".node")
            .data(nodes, d => d.id);

        const nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

        nodeEnter.append("circle")
            .attr("r", d => {
                // Calculate radius: base of 15 + 2 per character, with a minimum of 15 and max of 40
                const textLength = d.data.name.length;
                return Math.min(40, Math.max(15, 15 + textLength * 2));
            })
            .attr("filter", "url(#shadow)")
            .on("mouseover", function(event, d) {
                const baseRadius = Math.min(40, Math.max(15, 15 + d.data.name.length * 2));
                d3.select(this).transition().duration(200).attr("r", baseRadius + 5);
            })
            .on("mouseout", function(event, d) {
                const baseRadius = Math.min(40, Math.max(15, 15 + d.data.name.length * 2));
                d3.select(this).transition().duration(200).attr("r", baseRadius);
            })
            .on("click", (event, d) => {
                this.selectedNode = d;
                this.g.selectAll(".node").classed("node--selected", d2 => d2 === d);
            })
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
            .attr("dy", "0")
            .attr("x", 0)
            .style("text-anchor", "middle")
            .style("fill", "#333")
            .style("font-size", d => {
                // Adjust font size based on text length to ensure fit
                const textLength = d.data.name.length;
                return textLength > 15 ? "9px" : "11px";
            })
            .attr("transform", d => `rotate(${- (d.x * 180 / Math.PI - 90)})`)
            .text(d => d.data.name);

        node.merge(nodeEnter)
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

        node.exit().remove();

        // Add shadow filter
        this.svg.selectAll("defs").remove();
        this.svg.append("defs")
            .append("filter")
            .attr("id", "shadow")
            .append("feDropShadow")
            .attr("dx", 0)
            .attr("dy", 1)
            .attr("stdDeviation", 1.5)
            .attr("flood-opacity", 0.3);
    }
}