import { latLonToVector3 } from "./utils.js";

// Used for Triangulation
import earcut from "https://cdn.skypack.dev/earcut@2.2.4";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const sphereRadius = 5.0;
const sphereGeometry = new THREE.SphereGeometry(sphereRadius * 0.9, 64, 64);
const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: false,
    opacity: 0.0
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

sphere.rotation.x = Math.PI / 2;
scene.add(sphere);

const continentColors = {
    "Africa": 0xffd700,   // Gold
    "Asia": 0x00ff00,     // Green
    "Europe": 0x0000ff,   // Blue
    "Americas": 0xff0000, // Red
    "Oceania": 0xffa500,  // Orange
    "Antarctica": 0xffffff // White
};

const dots = [];

fetch("data/dots.ndjson")
    .then(response => response.text())
    .then(data => {
        const geoPoints = data.trim().split("\n").map(line => JSON.parse(line));

        geoPoints.forEach(point => {
            const {
                lat,
                lon,
                continent,
                country,
                geometry_type,
                coordinates
            } = point;

            const dotGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const dotMaterial = new THREE.MeshBasicMaterial({
                color: continentColors[continent] || 0x808080 // Default is Gray
            });
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            const position = latLonToVector3(lat, lon, sphereRadius);
            dot.position.copy(position);
            dot.userData = { lat, lon, country };
            sphere.add(dot);
            dots.push(dot);

            if (geometry_type && coordinates) {
                const material = new THREE.MeshBasicMaterial({
                    color: continentColors[continent] || 0x808080, // Default is Gray
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8
                });

                const processPolygon = (polygonCoords) => {
                    const vertices2D = [];
                    const holeIndices = [];
                    let vertexCount = 0;

                    polygonCoords.forEach((linearRing, i) => {
                        if (i > 0) {
                            holeIndices.push(vertexCount);
                        }
                        linearRing.forEach(([lon, lat]) => {
                            vertices2D.push(lon, lat);
                            vertexCount++;
                        });
                    });

                    // Triangulation
                    const indices = earcut(vertices2D, holeIndices, 2);

                    const vertices3D = [];
                    for (let i = 0; i < vertices2D.length; i += 2) {
                        const lon = vertices2D[i];
                        const lat = vertices2D[i + 1];
                        const vertex = latLonToVector3(lat, lon, sphereRadius + 0.01);
                        vertices3D.push(vertex.x, vertex.y, vertex.z);
                    }

                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices3D, 3));
                    geometry.setIndex(indices);

                    const mesh = new THREE.Mesh(geometry, material);
                    sphere.add(mesh);

                    polygonCoords.forEach((linearRing) => {
                        const borderVertices = [];
                        linearRing.forEach(([lon, lat]) => {
                            const vertex = latLonToVector3(lat, lon, sphereRadius + 0.012);
                            borderVertices.push(vertex.x, vertex.y, vertex.z);
                        });

                        const borderGeometry = new THREE.BufferGeometry();
                        borderGeometry.setAttribute("position", new THREE.Float32BufferAttribute(borderVertices, 3));
                        const borderMaterial = new THREE.LineBasicMaterial({ color: 0x000000 }); // Black Border 
                        const borderLine = new THREE.LineLoop(borderGeometry, borderMaterial);
                        sphere.add(borderLine);
                    });
                };

                if (geometry_type === "Polygon") {
                    processPolygon(coordinates);
                } else if (geometry_type === "MultiPolygon") {
                    coordinates.forEach(polygonCoords => {
                        processPolygon(polygonCoords);
                    });
                }
            }
        });

        const legendContainer = document.getElementById("legend");
        for (const [continent, color] of Object.entries(continentColors)) {
            const legendItem = document.createElement("div");
            legendItem.classList.add("legend-item");

            const colorBox = document.createElement("div");
            colorBox.classList.add("legend-color");
            colorBox.style.backgroundColor = `#${color.toString(16).padStart(6, "0")}`;

            const label = document.createElement("span");
            label.textContent = continent;

            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            legendContainer.appendChild(legendItem);
        }
    })
    .catch(error => console.error("Error loading the dots data:", error));

camera.position.set(10, 0, 0);
camera.up.set(0, 0, 1);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export { camera, dots, renderer, scene, sphere };
