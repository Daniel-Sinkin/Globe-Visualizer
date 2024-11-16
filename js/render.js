import { latLonToVector3 } from './utils.js';

// Include Earcut for triangulation
import earcut from 'https://cdn.skypack.dev/earcut@2.2.4';

// Set up scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing for smoother edges
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a sphere (globe)
const radius = 5; // Radius of the sphere
const sphereGeometry = new THREE.SphereGeometry(radius, 64, 64);
const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x223344,
    wireframe: true
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

// Align the sphere so that it matches the real orientation of Earth
sphere.rotation.x = Math.PI / 2; // Rotate 90 degrees to align poles correctly
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

// Load data and create dots and filled polygons
fetch('data/dots.ndjson')
    .then(response => response.text())
    .then(data => {
        const geoPoints = data.trim().split('\n').map(line => JSON.parse(line));

        // Create dots and polygons for each data point
        geoPoints.forEach(point => {
            const {
                lat,
                lon,
                continent,
                country,
                geometry_type,
                coordinates
            } = point;

            // Create dots
            const dotGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const dotMaterial = new THREE.MeshBasicMaterial({
                color: continentColors[continent] || 0x808080
            }); // Default to gray if continent not found
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            const position = latLonToVector3(lat, lon, radius);
            dot.position.copy(position);
            dot.userData = { lat, lon, country }; // Store the lat, lon, and country in userData for access later
            sphere.add(dot); // Add dot as a child of the sphere
            dots.push(dot); // Keep track of dots for raycasting

            // Draw filled polygons and borders
            if (geometry_type && coordinates) {
                const material = new THREE.MeshBasicMaterial({
                    color: continentColors[continent] || 0x808080,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.6
                });

                const processPolygon = (polygonCoords) => {
                    // Flatten the coordinates and keep track of hole indices for earcut
                    const vertices2D = []; // For triangulation in 2D
                    const holeIndices = [];
                    let vertexCount = 0;

                    polygonCoords.forEach((linearRing, i) => {
                        if (i > 0) {
                            // Start of a hole
                            holeIndices.push(vertexCount);
                        }
                        linearRing.forEach(([lon, lat]) => {
                            vertices2D.push(lon, lat);
                            vertexCount++;
                        });
                    });

                    // Triangulate the polygon
                    const indices = earcut(vertices2D, holeIndices, 2);

                    // Convert 2D vertices to 3D positions on the sphere
                    const vertices3D = [];
                    for (let i = 0; i < vertices2D.length; i += 2) {
                        const lon = vertices2D[i];
                        const lat = vertices2D[i + 1];
                        const vertex = latLonToVector3(lat, lon, radius + 0.01);
                        vertices3D.push(vertex.x, vertex.y, vertex.z);
                    }

                    // Create BufferGeometry for the filled polygon
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices3D, 3));
                    geometry.setIndex(indices);

                    // Create mesh for the filled polygon
                    const mesh = new THREE.Mesh(geometry, material);
                    sphere.add(mesh);

                    // Draw the country borders
                    polygonCoords.forEach((linearRing) => {
                        const borderVertices = [];
                        linearRing.forEach(([lon, lat]) => {
                            const vertex = latLonToVector3(lat, lon, radius + 0.012); // Slightly above the surface
                            borderVertices.push(vertex.x, vertex.y, vertex.z);
                        });

                        const borderGeometry = new THREE.BufferGeometry();
                        borderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(borderVertices, 3));
                        const borderMaterial = new THREE.LineBasicMaterial({ color: 0x000000 }); // Black color for borders
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

        // Add a legend to the HTML (assumes an existing element with id 'legend')
        const legendContainer = document.getElementById('legend');
        for (const [continent, color] of Object.entries(continentColors)) {
            const legendItem = document.createElement('div');
            legendItem.classList.add('legend-item');

            const colorBox = document.createElement('div');
            colorBox.classList.add('legend-color');
            colorBox.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;

            const label = document.createElement('span');
            label.textContent = continent;

            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            legendContainer.appendChild(legendItem);
        }
    })
    .catch(error => console.error('Error loading the dots data:', error));

// Position the camera and adjust orientation
camera.position.set(10, 0, 0); // Align camera on the x-axis, level with the equator
camera.up.set(0, 0, 1); // Set the up direction to align with the z-axis
camera.lookAt(0, 0, 0); // Ensure the camera is looking at the center of the globe

// Add ambient light for better visibility
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light for shading
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// Render loop
function animate() {
    requestAnimationFrame(animate);
    // Optionally rotate the sphere for a spinning globe effect
    // sphere.rotation.y += 0.001;
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Export objects
export { camera, dots, renderer, scene, sphere };
