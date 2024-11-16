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

// Convert latitude and longitude to 3D coordinates
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

// Color map for continents
const continentColors = {
    'Africa': 0xffd700,   // Gold
    'Asia': 0x00ff00,     // Green
    'Europe': 0x0000ff,   // Blue
    'Americas': 0xff0000, // Red
    'Oceania': 0xffa500,  // Orange
    'Antarctica': 0xffffff // White
};

// Create a div element for displaying coordinates and country
const infoBox = document.createElement('div');
infoBox.style.position = 'absolute';
infoBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
infoBox.style.color = 'white';
infoBox.style.padding = '5px';
infoBox.style.borderRadius = '5px';
infoBox.style.pointerEvents = 'none';
infoBox.style.display = 'none';
document.body.appendChild(infoBox);

// Set up raycaster and mouse vector
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Array to hold the created dots
const dots = [];

// Fetch and read the dots data from the NDJSON file
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

        // Add a legend to the HTML
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

        // Add markers for the North and South Poles for verification
        addMarker(90, 0, 0x00ff00); // North Pole in green
        addMarker(-90, 0, 0xff0000); // South Pole in red
    })
    .catch(error => console.error('Error loading the dots data:', error));

// Function to add verification markers
function addMarker(lat, lon, color = 0xff0000) {
    const markerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    const position = latLonToVector3(lat, lon, radius);
    marker.position.copy(position);
    sphere.add(marker);
}

// Handle mouse movement
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with the dots
    const intersects = raycaster.intersectObjects(dots);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const { lat, lon, country } = intersectedObject.userData;

        // Show the info box and update its content and position
        infoBox.style.display = 'block';
        infoBox.style.left = `${event.clientX + 10}px`;
        infoBox.style.top = `${event.clientY + 10}px`;
        infoBox.textContent = `${country}\n<${lat.toFixed(2)},${lon.toFixed(2)}>`;
    } else {
        // Hide the info box if no dot is hovered over
        infoBox.style.display = 'none';
    }
});

// Position the camera and adjust orientation
camera.position.set(10, 0, 0); // Align camera on the x-axis, level with the equator
camera.up.set(0, 0, 1); // Set the up direction to align with the z-axis
camera.lookAt(0, 0, 0); // Ensure the camera is looking at the center of the globe

// Mouse interaction variables
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Event listeners for mouse interaction
window.addEventListener('mousedown', (event) => {
    isDragging = true;
    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

window.addEventListener('mousemove', (event) => {
    if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;

        // Horizontal rotation (around the y-axis)
        sphere.rotation.y += deltaX * 0.005;

        previousMousePosition.x = event.clientX;
        previousMousePosition.y = event.clientY;
    }
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();