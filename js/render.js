import { latLonToVector3 } from './utils.js';

// Set up scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a sphere (globe)
const radius = 5; // Radius of the sphere
const sphereGeometry = new THREE.SphereGeometry(radius, 64, 64);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x223344, wireframe: true });
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

function addMarker(lat, lon, color = 0xff0000) {
    const markerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    const position = latLonToVector3(lat, lon, radius);
    marker.position.copy(position);
    sphere.add(marker);
}

// Load data and create dots
fetch('data/dots.ndjson')
    .then(response => response.text())
    .then(data => {
        const geoPoints = data.trim().split('\n').map(line => JSON.parse(line));

        // Create dots for each data point with continent-based colors
        geoPoints.forEach(point => {
            const { lat, lon, continent, country } = point;
            const dotGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const dotMaterial = new THREE.MeshBasicMaterial({ color: continentColors[continent] || 0x808080 }); // Default to gray if continent not found
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            const position = latLonToVector3(lat, lon, radius);
            dot.position.copy(position);
            dot.userData = { lat, lon, country }; // Store the lat, lon, and country in userData for access later
            sphere.add(dot); // Add dot as a child of the sphere
            dots.push(dot); // Keep track of dots for raycasting
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

// Export objects
export { camera, dots, renderer, scene, sphere };
