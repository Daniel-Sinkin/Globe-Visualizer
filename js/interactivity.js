import { camera, dots, renderer, scene, sphere } from './render.js';
import { smoothstep } from './utils.js';

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

// Flag to track if an animation is in progress
let isAnimating = false;

// Helper function to wrap rotation between -PI and PI
function wrapRotation(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

// Handle mouse movement
window.addEventListener('mousemove', (event) => {
    if (isAnimating) return; // Disable interaction during animation

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

// Handle double-click event for rotating the globe to a clicked dot
window.addEventListener('dblclick', (event) => {
    if (isAnimating) return; // Prevent new interaction while animating

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with the dots
    const intersects = raycaster.intersectObjects(dots);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const { lon } = intersectedObject.userData;

        // Calculate the target rotation angle for the longitude
        let targetRotationY = -THREE.MathUtils.degToRad(lon);
        targetRotationY = wrapRotation(targetRotationY); // Wrap the target rotation

        // Animate the rotation to the target longitude
        let startRotationY = wrapRotation(sphere.rotation.y);
        let deltaRotationY = targetRotationY - startRotationY;

        // Adjust the delta if the shorter path is in the opposite direction
        if (deltaRotationY > Math.PI) deltaRotationY -= 2 * Math.PI;
        if (deltaRotationY < -Math.PI) deltaRotationY += 2 * Math.PI;

        const animationDuration = 1000; // Duration in milliseconds
        const startTime = performance.now();
        isAnimating = true; // Set animation flag to true

        function animateRotation() {
            const elapsedTime = performance.now() - startTime;
            const t = Math.min(elapsedTime / animationDuration, 1); // Normalize to range [0, 1]

            // Use smoothstep for smooth interpolation
            const smoothT = smoothstep(0, 1, t);

            // Update the sphere's rotation and wrap it
            sphere.rotation.y = wrapRotation(startRotationY + deltaRotationY * smoothT);

            // Continue animating until the duration is complete
            if (t < 1) {
                requestAnimationFrame(animateRotation);
            } else {
                isAnimating = false; // Reset animation flag when complete
            }
        }

        animateRotation();
    }
});

// Mouse interaction variables
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Event listeners for mouse interaction
window.addEventListener('mousedown', (event) => {
    if (isAnimating) return; // Disable interaction during animation
    isDragging = true;
    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
});

window.addEventListener('mouseup', () => {
    if (isAnimating) return; // Disable interaction during animation
    isDragging = false;
});

window.addEventListener('mousemove', (event) => {
    if (isAnimating) return; // Disable interaction during animation
    if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;

        // Horizontal rotation (around the y-axis) with wrapping
        sphere.rotation.y = wrapRotation(sphere.rotation.y + deltaX * 0.005);

        previousMousePosition.x = event.clientX;
        previousMousePosition.y = event.clientY;
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();