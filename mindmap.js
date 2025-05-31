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
                .attr("class", "main")
                .attr("r", d => Math.min(40, Math.max(15, 15 + d.data.name.length * 2)))
                .attr("filter", "url(#shadow)")
                .on("mouseover", function(event, d) {
                    const baseRadius = Math.min(40, Math.max(15, 15 + d.data.name.length * 2));
                    d3.select(this).transition().duration(200).attr("r", baseRadius + 5);
                    d3.select(this.parentNode).select(".progress-ring").transition().duration(200).attr("stroke", "#34d399");
                })
                .on("mouseout", function(event, d) {
                    const baseRadius = Math.min(40, Math.max(15, 15 + d.data.name.length * 2));
                    d3.select(this).transition().duration(200).attr("r", baseRadius);
                    d3.select(this.parentNode).select(".progress-ring").transition().duration(200).attr("stroke", "#10b981");
                })
                .on("click", (event, d) => {
                    eventEmitter.emit("nodeClick", d);
                })
                .on("dblclick", (event, d) => {
                    eventEmitter.emit("nodeDoubleClick", d);
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

            nodeEnter.append("circle")
                .attr("class", "progress-bg")
                .attr("r", d => Math.min(40, Math.max(15, 15 + d.data.name.length * 2)) + 6);

            nodeEnter.append("circle")
                .attr("class", "progress-ring")
                .attr("r", d => Math.min(40, Math.max(15, 15 + d.data.name.length * 2)) + 6)
                .each(function(d) {
                    d.progress = d.progress || Math.floor(Math.random() * 101);
                    const circumference = 2 * Math.PI * (Math.min(40, Math.max(15, 15 + d.data.name.length * 2)) + 6);
                    const dashOffset = circumference * (1 - d.progress / 100);
                    d3.select(this)
                        .attr("stroke-dasharray", `${circumference} ${circumference}`)
                        .attr("stroke-dashoffset", circumference)
                        .transition()
                        .duration(1000)
                        .attr("stroke-dashoffset", dashOffset);
                });

            nodeEnter.append("text")
                .attr("class", "node-label")
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
            this.viewHistory = [];
            this.currentTransform = d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(1);

            this.zoom = d3.zoom()
                .scaleExtent([0.3, 3])
                .on("zoom", (event) => {
                    this.currentTransform = event.transform;
                    this.g.attr("transform", event.transform.translate(this.width / 2, this.height / 2));
                    this.eventEmitter.emit("zoom", event.transform);
                });
            this.svg.call(this.zoom).call(this.zoom.transform, this.currentTransform);

            this.slidePanel = d3.select("#slidePanel");
            this.slidePanelBody = d3.select("#slidePanelBody");
            this.slidePanelClose = d3.select("#slidePanelClose");
            this.slidePanelClose.on("click", () => {
                this.slidePanel.classed("open", false);
            });

            this.backButton = d3.select("#slidePanelBack");
            this.backButton.on("click", () => {
                this.goBack();
            });

            this.setupShadowFilter();
            this.updateBackButtonState();

            this.eventEmitter.on("nodeClick", (d) => {
                this.g.selectAll(".node").classed("active", false);
                this.g.selectAll(".link").classed("active", false);

                this.g.selectAll(".node")
                    .filter(d2 => d2 === d)
                    .classed("active", true);

                const pathNodes = [];
                let current = d;
                while (current) {
                    pathNodes.push(current);
                    current = current.parent;
                }

                this.g.selectAll(".node")
                    .filter(d2 => pathNodes.includes(d2))
                    .classed("active", true);

                this.g.selectAll(".link")
                    .filter(link => pathNodes.includes(link.target) && pathNodes.includes(link.source))
                    .classed("active", true);

                d3.select("#slidePanelTitle").text(`Summary: ${d.data.name}`);
                this.updateSlidePanelContent(d.data, pathNodes);
                this.slidePanel.classed("open", true);
            });

            this.eventEmitter.on("nodeDoubleClick", (d) => {
                this.setNewRoot(d);
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

        addNode(parentName, newNode) {
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
                const nodeData = typeof newNode === 'string' ? { name: newNode } : newNode;
                parent.children.push(nodeData);
                this.root = d3.hierarchy(this.data);
                this.root.x0 = 0;
                this.root.y0 = 0;
                this.eventEmitter.emit("update");
            } else {
                console.error(`Parent node "${parentName}" not found`);
            }
        }

        setNewRoot(node) {
            // Save current view state
            this.viewHistory.push({
                data: JSON.parse(JSON.stringify(this.data)),
                transform: this.currentTransform
            });

            // Create new data structure with the clicked node as root
            this.data = {
                name: node.data.name,
                children: node.data.children ? JSON.parse(JSON.stringify(node.data.children)) : [],
                progress: node.data.progress,
                summary: node.data.summary
            };
            this.root = d3.hierarchy(this.data);
            this.root.x0 = 0;
            this.root.y0 = 0;

            // Reset transform
            this.currentTransform = d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(1);
            this.svg.call(this.zoom.transform, this.currentTransform);
            this.g.attr("transform", this.currentTransform);

            this.updateBackButtonState();
            this.eventEmitter.emit("update");
        }

        goBack() {
            if (this.viewHistory.length === 0) return;

            // Restore previous view state
            const previousState = this.viewHistory.pop();
            this.data = previousState.data;
            this.root = d3.hierarchy(this.data);
            this.root.x0 = 0;
            this.root.y0 = 0;
            this.currentTransform = previousState.transform;
            this.svg.call(this.zoom.transform, this.currentTransform);
            this.g.attr("transform", this.currentTransform);

            this.updateBackButtonState();
            this.eventEmitter.emit("update");
        }

        updateBackButtonState() {
            this.backButton.attr("disabled", this.viewHistory.length === 0 ? true : null);
        }

        updateSlidePanelContent(nodeData, pathNodes) {
            this.slidePanelBody.selectAll("*").remove();

            // Add breadcrumb
            const breadcrumb = this.slidePanelBody.append("div")
                .attr("class", "breadcrumb");

            pathNodes.reverse().forEach((node, index) => {
                const item = breadcrumb.append("span")
                    .attr("class", "breadcrumb-item")
                    .text(node.data.name)
                    .on("click", () => {
                        this.eventEmitter.emit("nodeClick", node);
                    });

                if (node.data.name.length > 20) {
                    item.text(node.data.name.substring(0, 17) + "...");
                }
            });

            // Add node content
            const content = nodeData.summary || {
                description: `Information about <strong>${nodeData.name}</strong>.`,
                details: ["No additional details available."]
            };

            const chatMessage = this.slidePanelBody.append("div")
                .attr("class", "chat-message");

            chatMessage.append("div")
                .html(content.description || `Information about <strong>${nodeData.name}</strong>.`);

            const ul = chatMessage.append("ul");
            (content.details || ["No additional details available."]).forEach(detail => {
                ul.append("li").text(detail);
            });
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