import { camera, dots, renderer, scene, sphere } from "./render.js";
import { smoothstep } from "./utils.js";

const maxRotationX = THREE.MathUtils.degToRad(50);
const minRotationX = THREE.MathUtils.degToRad(-50);

const infoBox = document.createElement("div");
infoBox.style.position = "absolute";
infoBox.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
infoBox.style.color = "white";
infoBox.style.padding = "5px";
infoBox.style.borderRadius = "5px";
infoBox.style.pointerEvents = "none";
infoBox.style.display = "none";
document.body.appendChild(infoBox);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Disables interactivity when set
let isAnimating = false;

function wrapRotation(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

// Handle mouse movement
window.addEventListener("mousemove", (event) => {
    if (isAnimating) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(dots);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const { lat, lon, country } = intersectedObject.userData;

        infoBox.style.display = "block";
        infoBox.style.left = `${event.clientX + 10}px`;
        infoBox.style.top = `${event.clientY + 10}px`;
        infoBox.textContent = `${country}\n<${lat.toFixed(2)},${lon.toFixed(2)}>`;
    } else {
        infoBox.style.display = "none";
    }
});


// Double clicking on a country dot starts an animation that moves towards that point
window.addEventListener("dblclick", (event) => {
    if (isAnimating) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(dots);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const { lon } = intersectedObject.userData;

        let targetRotationY = -THREE.MathUtils.degToRad(lon);
        targetRotationY = wrapRotation(targetRotationY);

        let startRotationY = wrapRotation(sphere.rotation.y);
        let deltaRotationY = targetRotationY - startRotationY;

        if (deltaRotationY > Math.PI) deltaRotationY -= 2 * Math.PI;
        if (deltaRotationY < -Math.PI) deltaRotationY += 2 * Math.PI;

        const animationDurationMS = 1000;
        const startTime = performance.now();
        isAnimating = true;

        function animateRotation() {
            const elapsedTime = performance.now() - startTime;
            const t = Math.min(elapsedTime / animationDurationMS, 1);

            const smoothT = smoothstep(0, 1, t);

            sphere.rotation.y = wrapRotation(startRotationY + deltaRotationY * smoothT);

            if (t < 1) {
                requestAnimationFrame(animateRotation);
            } else {
                isAnimating = false;
            }
        }

        animateRotation();
    }
});

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// When the mouse button is down we can drag the globe
window.addEventListener("mousedown", (event) => {
    if (isAnimating) return;
    isDragging = true;
    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
});

window.addEventListener("mouseup", () => {
    if (isAnimating) return;
    isDragging = false;
});

window.addEventListener("mousemove", (event) => {
    if (isAnimating) return;
    if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;

        sphere.rotation.y = wrapRotation(sphere.rotation.y + deltaX * 0.005);

        previousMousePosition.x = event.clientX;
        previousMousePosition.y = event.clientY;
    }
});

window.addEventListener("wheel", (event) => {
    if (isAnimating) return;

    const delta = Math.sign(event.deltaY);

    const rotationChange = THREE.MathUtils.degToRad(-10 * delta);

    sphere.rotation.z = sphere.rotation.z + rotationChange;
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();