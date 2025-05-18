class MindMap {
    constructor(svgSelector, width, height) {
        this.svg = d3.select(svgSelector);
        this.width = width;
        this.height = height;
        this.g = this.svg.append("g").attr("transform", "translate(40,0)");
        this.tree = d3.tree().size([height, width - 160]);
        this.data = { name: "Root", children: [] };
        this.root = d3.hierarchy(this.data);
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
            this.update();
        } else {
            console.error(`Parent node "${parentName}" not found`);
        }
    }

    update() {
        const treeData = this.tree(this.root);
        const nodes = treeData.descendants();
        const links = treeData.links();

        const link = this.g.selectAll(".link")
            .data(links, d => d.target.id);

        link.enter().append("path")
            .attr("class", "link")
            .merge(link)
            .attr("d", d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        link.exit().remove();

        const node = this.g.selectAll(".node")
            .data(nodes, d => d.id);

        const nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.y},${d.x})`);

        nodeEnter.append("circle")
            .attr("r", 5);

        nodeEnter.append("text")
            .attr("dy", ".35em")
            .attr("x", d => d.children ? -8 : 8)
            .style("text-anchor", d => d.children ? "end" : "start")
            .text(d => d.data.name);

        node.merge(nodeEnter)
            .attr("transform", d => `translate(${d.y},${d.x})`);

        node.exit().remove();
    }
}