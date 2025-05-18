const data = {
    name: "Root",
    children: [
        {
            name: "Branch 1",
            children: [
                { name: "Leaf 1.1" },
                { name: "Leaf 1.2" }
            ]
        },
        {
            name: "Branch 2",
            children: [
                { name: "Leaf 2.1" },
                { name: "Leaf 2.2" }
            ]
        }
    ]
};

const svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    g = svg.append("g").attr("transform", "translate(40,0)");

const tree = d3.tree().size([height, width - 160]);

const root = d3.hierarchy(data);

const treeData = tree(root);

const nodes = treeData.descendants();
const links = treeData.links();

const link = g.selectAll(".link")
    .data(links)
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x));

const node = g.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.y},${d.x})`);

node.append("circle")
    .attr("r", 5);

node.append("text")
    .attr("dy", ".35em")
    .attr("x", d => d.children ? -8 : 8)
    .style("text-anchor", d => d.children ? "end" : "start")
    .text(d => d.data.name);