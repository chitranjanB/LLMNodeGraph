const MindMapModule = (function() {
    class EventEmitter {
        constructor() {
            this.listeners = new Map();
        }
        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }
        emit(event, ...args) {
            const callbacks = this.listeners.get(event) || [];
            callbacks.forEach(cb => cb(...args));
        }
    }

    class LayoutStrategy {
        computeLayout(root, width, height) {
            throw new Error("computeLayout must be implemented");
        }
    }

    class RadialLayout extends LayoutStrategy {
        computeLayout(root, width, height) {
            const tree = d3.tree()
                .size([2 * Math.PI, Math.min(width, height) / 2 - 120])
                .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);
            const treeData = tree(root);
            treeData.descendants().forEach(d => {
                d.y = d.depth * 110;
            });
            return treeData;
        }
    }

    class Renderer {
        renderNodes(g, nodes, config, eventEmitter) {
            throw new Error("renderNodes must be implemented");
        }
        renderLinks(g, links, config) {
            throw new Error("renderLinks must be implemented");
        }
    }

    class SVGRenderer extends Renderer {
        renderNodes(g, nodes, config, eventEmitter) {
            const node = g.selectAll(".node")
                .data(nodes, d => d.id);

            const nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

            nodeEnter.append("circle")
                .attr("r", d => Math.min(40, Math.max(15, 15 + d.data.name.length * 2)))
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
                    eventEmitter.emit("nodeClick", d);
                })
                .call(d3.drag()
                    .on("start", (event, d) => {
                        d.x0 = d.x;
                        d.y0 = d.y;
                    })
                    .on("drag", (event, d) => {
                        d.x = event.x;
                        d.y = event.y;
                        eventEmitter.emit("update");
                    }));

            nodeEnter.append("text")
                .attr("dy", "0")
                .attr("x", 0)
                .style("text-anchor", "middle")
                .style("fill", "#333")
                .style("font-size", d => d.data.name.length > 15 ? "9px" : "11px")
                .attr("transform", d => `rotate(${- (d.x * 180 / Math.PI - 90)})`)
                .text(d => d.data.name);

            node.merge(nodeEnter)
                .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

            node.exit().remove();
        }

        renderLinks(g, links, config) {
            const link = g.selectAll(".link")
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
        }
    }

    class NodeStyleDecorator {
        constructor(baseRenderer, styleConfig) {
            this.baseRenderer = baseRenderer;
            this.styleConfig = styleConfig;
        }

        renderNodes(g, nodes, config, eventEmitter) {
            this.baseRenderer.renderNodes(g, nodes, { ...config, style: this.styleConfig }, eventEmitter);
        }

        renderLinks(g, links, config) {
            this.baseRenderer.renderLinks(g, links, { ...config, style: this.styleConfig });
        }
    }

    class MindMap {
        constructor(config) {
            this.svg = d3.select(config.svgSelector);
            this.width = config.width || 800;
            this.height = config.height || 600;
            this.g = this.svg.append("g")
                .attr("transform", `translate(${this.width / 2},${this.height / 2})`);
            
            this.eventEmitter = new EventEmitter();
            this.layoutStrategy = config.layoutStrategy || new RadialLayout();
            this.renderer = config.renderer || new SVGRenderer();
            if (config.styleConfig) {
                this.renderer = new NodeStyleDecorator(this.renderer, config.styleConfig);
            }

            this.data = config.data || { name: "Root", children: [] };
            this.root = d3.hierarchy(this.data);
            this.root.x0 = 0;
            this.root.y0 = 0;

            this.zoom = d3.zoom()
                .scaleExtent([0.3, 3])
                .on("zoom", (event) => {
                    this.g.attr("transform", event.transform.translate(this.width / 2, this.height / 2));
                    this.eventEmitter.emit("zoom", event.transform);
                });
            this.svg.call(this.zoom).call(this.zoom.transform, d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(1));

            this.modal = new bootstrap.Modal(document.getElementById('nodeModal'), { keyboard: true });

            this.setupShadowFilter();

            this.eventEmitter.on("nodeClick", (d) => {
                this.g.selectAll(".node").classed("node--selected", d2 => d2 === d);
                d3.select('#nodeModalLabel').text(`Node: ${d.data.name}`);
                this.modal.show();
            });

            this.eventEmitter.on("update", () => this.update());

            this.update();
        }

        setupShadowFilter() {
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
                this.eventEmitter.emit("update");
            } else {
                console.error(`Parent node "${parentName}" not found`);
            }
        }

        update() {
            const treeData = this.layoutStrategy.computeLayout(this.root, this.width, this.height);
            const nodes = treeData.descendants();
            const links = treeData.links();

            this.renderer.renderNodes(this.g, nodes, {}, this.eventEmitter);
            this.renderer.renderLinks(this.g, links, {});
            this.eventEmitter.emit("updated", { nodes, links });
        }

        on(event, callback) {
            this.eventEmitter.on(event, callback);
        }
    }

    const MindMapFactory = {
        createRadialMindMap(config) {
            return new MindMap({
                ...config,
                layoutStrategy: new RadialLayout(),
                renderer: new SVGRenderer()
            });
        },
        createCustomMindMap(config) {
            return new MindMap(config);
        }
    };

    return {
        MindMapFactory,
        LayoutStrategy,
        Renderer,
        RadialLayout,
        SVGRenderer,
        NodeStyleDecorator
    };
})();