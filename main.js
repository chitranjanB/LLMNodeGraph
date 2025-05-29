const mindMap = MindMapModule.MindMapFactory.createRadialMindMap({
    svgSelector: "svg",
    width: 800,
    height: 400,
    styleConfig: {
        nodeFill: "#ffffff",
        nodeStroke: "#007bff"
    }
});

mindMap.addNode("Root", {
    name: "ReactJs",
    summary: {
        description: "<strong>React.js</strong> is a popular <em>JavaScript library</em> for building user interfaces, especially single-page applications.",
        details: [
            "Component-Based Architecture",
            "Virtual DOM for Efficient Rendering",
            "Declarative Syntax",
            "Unidirectional Data Flow",
            "Strong Ecosystem and Community"
        ]
    }
});
mindMap.addNode("Root", {
    name: "AngularJs",
    summary: {
        description: "<strong>AngularJS</strong> is a JavaScript-based open-source front-end web framework for building dynamic web applications.",
        details: [
            "MVC Architecture",
            "Two-Way Data Binding",
            "Dependency Injection",
            "Directives for DOM Manipulation",
            "Maintained by Google"
        ]
    }
});
mindMap.addNode("ReactJs", {
    name: "JSX",
    summary: {
        description: "<strong>JSX</strong> is a syntax extension for JavaScript used with React to describe UI components.",
        details: [
            "XML-like Syntax",
            "Compiles to JavaScript",
            "Improves Readability",
            "Integrates with React Components"
        ]
    }
});
mindMap.addNode("ReactJs", {
    name: "React Context",
    summary: {
        description: "<strong>React Context</strong> provides a way to pass data through the component tree without prop drilling.",
        details: [
            "Global State Management",
            "Avoids Prop Drilling",
            "Built-in React API",
            "Useful for Theming and Authentication"
        ]
    }
});
mindMap.addNode("AngularJs", {
    name: "What is AngularJs",
    summary: {
        description: "An overview of AngularJS, its purpose, and its role in web development.",
        details: [
            "JavaScript Framework",
            "Developed by Google",
            "Used for Dynamic Web Apps",
            "Supports MVC Pattern"
        ]
    }
});
mindMap.addNode("AngularJs", {
    name: "Advantages",
    summary: {
        description: "Advantages of using AngularJS in web development projects.",
        details: [
            "Rapid Development",
            "Modular Structure",
            "Community Support",
            "Reusable Components"
        ]
    }
});

mindMap.on("updated", ({ nodes, links }) => {
    console.log(`Mind map updated with ${nodes.length} nodes and ${links.length} links`);
});