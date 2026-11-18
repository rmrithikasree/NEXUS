// ==========================================
// NEXUS — INTERACTIVE ROUTE INTELLIGENCE
// ==========================================

const locations = {
    G: { name: "Guwahati", x: 180, y: 115 },
    S: { name: "Shillong", x: 270, y: 160 },
    I: { name: "Imphal", x: 355, y: 125 },
    K: { name: "Kohima", x: 410, y: 170 },
    A: { name: "Aizawl", x: 350, y: 265 }
};

// Illustrative network data

const roads = [
    { from: "G", to: "S", distance: 20, risk: "safe" },
    { from: "S", to: "I", distance: 25, risk: "blocked" },
    { from: "G", to: "I", distance: 30, risk: "safe" },
    { from: "I", to: "K", distance: 35, risk: "safe" },
    { from: "S", to: "A", distance: 40, risk: "risky" },
    { from: "A", to: "K", distance: 45, risk: "safe" },
    { from: "G", to: "A", distance: 70, risk: "safe" }
];


// ==========================================
// MAP ANIMATION ENGINE
// ==========================================

const svg = document.querySelector(".region-svg");

function drawNetworkMap(selectedRoute = null) {

    if (!svg) return;

    // Remove previous dynamic map elements

    svg.querySelectorAll(".dynamic-network").forEach(
        element => element.remove()
    );

    // Hide old decorative route paths

    svg.querySelectorAll(".route, .moving-dot").forEach(
        element => element.style.display = "none"
    );

    const networkGroup = document.createElementNS(
        "http://www.w3.org/2000/svg", "g"
    );

    networkGroup.setAttribute("class", "dynamic-network");

    // Draw all road connections

    roads.forEach(road => {

        const start = locations[road.from];
        const end = locations[road.to];

        const line = document.createElementNS(
            "http://www.w3.org/2000/svg", "line"
        );

        line.setAttribute("x1", start.x);
        line.setAttribute("y1", start.y);
        line.setAttribute("x2", end.x);
        line.setAttribute("y2", end.y);

        const colors = {
            safe: "#28e6ff",
            risky: "#ffd166",
            blocked: "#ff668e"
        };

        line.setAttribute("stroke", colors[road.risk]);
        line.setAttribute("stroke-width", "3");
        line.setAttribute("opacity", "0.85");

        if (road.risk === "blocked") {
            line.setAttribute("stroke-dasharray", "6 6");
        }

        line.style.filter =
            `drop-shadow(0 0 5px ${colors[road.risk]})`;

        networkGroup.appendChild(line);

    });

    // Highlight selected route

    if (selectedRoute && selectedRoute.path.length > 1) {

        const points = selectedRoute.path.map(node => {
            return `${locations[node].x},${locations[node].y}`;
        }).join(" ");

        const pathData = selectedRoute.path.map((node, index) => {

            const location = locations[node];

            return `${index === 0 ? "M" : "L"} ${location.x} ${location.y}`;

        }).join(" ");

        const highlight = document.createElementNS(
            "http://www.w3.org/2000/svg", "polyline"
        );

        highlight.setAttribute("points", points);
        highlight.setAttribute("fill", "none");
        highlight.setAttribute("stroke", "#ffffff");
        highlight.setAttribute("stroke-width", "5");
        highlight.setAttribute("stroke-linecap", "round");
        highlight.setAttribute("stroke-linejoin", "round");

        highlight.style.filter =
            "drop-shadow(0 0 9px #28e6ff)";

        networkGroup.appendChild(highlight);

        // Animated delivery marker

        const marker = document.createElementNS(
            "http://www.w3.org/2000/svg", "circle"
        );

        marker.setAttribute("r", "8");
        marker.setAttribute("fill", "#ffffff");
        marker.setAttribute("stroke", "#28e6ff");
        marker.setAttribute("stroke-width", "4");

        marker.style.filter =
            "drop-shadow(0 0 10px #28e6ff)";

        const motion = document.createElementNS(
            "http://www.w3.org/2000/svg", "animateMotion"
        );

        motion.setAttribute("dur", "5s");
        motion.setAttribute("repeatCount", "indefinite");
        motion.setAttribute("path", pathData);

        marker.appendChild(motion);

        networkGroup.appendChild(marker);

    }

    // Put dynamic network behind city labels

    svg.insertBefore(networkGroup, svg.firstChild);

}


// ==========================================
// DIJKSTRA ROUTE ALGORITHM
// ==========================================

function findRoute(start, end, excludedRoad = null) {

    const distances = {};
    const previous = {};
    const visited = new Set();

    Object.keys(locations).forEach(node => {
        distances[node] = Infinity;
    });

    distances[start] = 0;

    while (visited.size < Object.keys(locations).length) {

        let current = null;

        for (const node of Object.keys(locations)) {

            if (!visited.has(node) &&
                (current === null ||
                distances[node] < distances[current])) {

                current = node;
            }

        }

        if (current === null ||
            distances[current] === Infinity) break;

        if (current === end) break;

        visited.add(current);

        roads.forEach((road, index) => {

            if (index === excludedRoad) return;
            if (road.risk === "blocked") return;

            let next = null;

            if (road.from === current) next = road.to;
            else if (road.to === current) next = road.from;

            if (!next || visited.has(next)) return;

            const penalty = road.risk === "risky" ? 20 : 0;

            const cost = road.distance + penalty;

            const newDistance = distances[current] + cost;

            if (newDistance < distances[next]) {

                distances[next] = newDistance;

                previous[next] = {
                    node: current,
                    roadIndex: index
                };

            }

        });

    }

    if (distances[end] === Infinity) return null;

    const path = [];
    const usedRoads = [];

    let current = end;

    while (current !== start) {

        path.unshift(current);

        const step = previous[current];

        if (!step) return null;

        usedRoads.unshift(step.roadIndex);

        current = step.node;

    }

    path.unshift(start);

    const selectedRoads = usedRoads.map(
        index => roads[index]
    );

    const actualDistance = selectedRoads.reduce(
        (sum, road) => sum + road.distance, 0
    );

    const riskyCount = selectedRoads.filter(
        road => road.risk === "risky"
    ).length;

    return {
        path,
        roads: selectedRoads,
        distance: actualDistance,
        cost: distances[end],
        riskyCount
    };

}


// ==========================================
// ALTERNATIVE ROUTE
// ==========================================

function findAlternative(start, end, mainRoute) {

    if (!mainRoute) return null;

    let bestAlternative = null;

    mainRoute.roads.forEach(road => {

        const index = roads.indexOf(road);

        const alternative = findRoute(start, end, index);

        if (!alternative) return;

        if (alternative.path.join("-") ===
            mainRoute.path.join("-")) return;

        if (!bestAlternative ||
            alternative.cost < bestAlternative.cost) {

            bestAlternative = alternative;

        }

    });

    return bestAlternative;

}


// ==========================================
// ROUTE RESULT DISPLAY
// ==========================================

function displayRoute(route, title) {

    if (!route) {

        return `
            <div class="result-card">
                <h4>${title}</h4>
                <p>No available alternative route found.</p>
            </div>
        `;

    }

    const names = route.path.map(
        node => locations[node].name
    ).join(" → ");

    const badge = route.riskyCount > 0
        ? '<span class="route-badge warning">Risk involved</span>'
        : '<span class="route-badge">Safe route</span>';

    return `

        <div class="result-card">

            <h4>${title}</h4>

            <div class="route-path">
                ${names}
            </div>

            <p>
                Distance: ${route.distance} demo units<br>
                Risk penalty: ${route.cost - route.distance}<br>
                Risky road segments: ${route.riskyCount}
            </p>

            ${badge}

        </div>

    `;

}


// ==========================================
// ANALYZE ROUTE BUTTON
// ==========================================

const analyzeButton = document.getElementById("analyzeBtn");

if (analyzeButton) {

    analyzeButton.addEventListener("click", () => {

        const start = document.getElementById("source").value;

        const end = document.getElementById("destination").value;

        const results = document.getElementById("routeResults");

        const error = document.getElementById("routeError");

        error.textContent = "";

        if (start === end) {

            error.textContent =
                "Please select two different locations.";

            results.innerHTML = "";

            drawNetworkMap();

            return;

        }

        analyzeButton.disabled = true;
        analyzeButton.textContent = "Analyzing...";

        setTimeout(() => {

            const mainRoute = findRoute(start, end);

            if (!mainRoute) {

                results.innerHTML = `
                    <div class="result-card">
                        <h4>No available route</h4>
                        <p>
                            No connected route is available
                            between the selected locations.
                        </p>
                    </div>
                `;

                drawNetworkMap();

                analyzeButton.disabled = false;
                analyzeButton.textContent = "Analyze Route →";

                return;

            }

            const alternative = findAlternative(
                start, end, mainRoute
            );

            // Update animated map

            drawNetworkMap(mainRoute);

            // Network statistics

            const blockedCount = roads.filter(
                road => road.risk === "blocked"
            ).length;

            const riskyCount = roads.filter(
                road => road.risk === "risky"
            ).length;

            // Display results

            results.innerHTML = `

                ${displayRoute(
                    mainRoute,
                    "RECOMMENDED ROUTE"
                )}

                ${displayRoute(
                    alternative,
                    "ALTERNATIVE ROUTE"
                )}

                <div class="result-card">

                    <h4>NETWORK RISK ANALYSIS</h4>

                    <p>
                        Total road connections: ${roads.length}<br>
                        Blocked connections: ${blockedCount}<br>
                        Risky connections: ${riskyCount}<br>
                        Available connections:
                        ${roads.length - blockedCount}
                    </p>

                </div>

                <p style="color:#8fa9c8;font-size:11px;">
                    Simulated network · Illustrative data only.
                </p>

            `;

            analyzeButton.disabled = false;
            analyzeButton.textContent = "Analyze Route →";

        }, 600);

    });

}


// ==========================================
// INITIALIZE MAP
// ==========================================

drawNetworkMap();