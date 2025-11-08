(function() { // IIFE to avoid variable conflicts with other Three.js scripts
// Scene setup
const canvas = document.getElementById('canvas-inscribed-norm-ball');
const scene = new THREE.Scene();

// Set canvas dimensions to fit within text column - wider for side-by-side
const aspectRatio = 21 / 9; // Wider aspect ratio for two setups
let canvasWidth = Math.min(800, canvas.parentElement.clientWidth || 800); // Max width 800px
let canvasHeight = canvasWidth / aspectRatio;

const camera = new THREE.PerspectiveCamera(
    60, // Adjusted FOV for better framing
    aspectRatio,
    0.1,
    1000
);
camera.position.set(0, 7, 14); // Center camera, slightly closer

// Ensure parent container has a max-width
if (canvas.parentElement) {
    canvas.parentElement.style.maxWidth = '100%';
}

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,  // Use the existing canvas element
    antialias: true,
    alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3)); // Cap pixel ratio
renderer.setSize(canvasWidth, canvasHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Create 2D overlay canvas for UI elements
const overlayCanvas = document.createElement('canvas');
overlayCanvas.width = canvasWidth * window.devicePixelRatio;
overlayCanvas.height = canvasHeight * window.devicePixelRatio;
overlayCanvas.style.position = 'absolute';
overlayCanvas.style.top = '0';
overlayCanvas.style.left = '0';
overlayCanvas.style.width = canvasWidth + 'px';
overlayCanvas.style.height = canvasHeight + 'px';
overlayCanvas.style.pointerEvents = 'none';

// Ensure parent has relative positioning
const canvasParent = canvas.parentElement;
canvasParent.style.position = 'relative';
canvasParent.appendChild(overlayCanvas);

const ctx = overlayCanvas.getContext('2d');
ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

// Hover state for fade effect
let leftCueOpacity = 0;
let leftTargetOpacity = 0;
let rightCueOpacity = 0;
let rightTargetOpacity = 0;
let hasInteracted = false;  // Track if user has clicked and dragged

// Draw click & drag cues (one per sphere)
function drawCue() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Skip drawing if both are fully transparent
    if (leftCueOpacity < 0.01 && rightCueOpacity < 0.01) {
        ctx.restore();
        return;
    }

    // Position cues below each sphere
    const leftCenterX = canvasWidth * 0.3;  // Left sphere is roughly at 30% of canvas width
    const rightCenterX = canvasWidth * 0.7; // Right sphere is roughly at 70% of canvas width
    const arrowY = canvasHeight * 0.9;
    const textY = canvasHeight * 0.93;

    ctx.save();
    ctx.strokeStyle = '#888888';
    ctx.fillStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw left cue if visible
    if (leftCueOpacity > 0.01) {
        ctx.globalAlpha = leftCueOpacity;
        drawSingleCue(leftCenterX, arrowY, textY);
    }

    // Draw right cue if visible
    if (rightCueOpacity > 0.01) {
        ctx.globalAlpha = rightCueOpacity;
        drawSingleCue(rightCenterX, arrowY, textY);
    }

    ctx.restore();

    ctx.restore();
}

function drawSingleCue(centerX, arrowY, textY) {
    ctx.save();

    // Left curved arrow
    ctx.save();
    ctx.translate(centerX - 45, arrowY);
    ctx.beginPath();

    // Use quadratic curve for smooth arc
    const leftStartX = -25;
    const leftStartY = -2;
    const leftEndX = -5;
    const leftEndY = 8;
    const leftControlX = -18;  // Control point for curve
    const leftControlY = 4;    // Reduced curve - midway between start and end Y

    ctx.moveTo(leftStartX, leftStartY);
    ctx.quadraticCurveTo(leftControlX, leftControlY, leftEndX, leftEndY);
    ctx.stroke();

    // Calculate tangent angle at the START of the curve
    // For quadratic curve, tangent at start point is from start point to control point
    const leftTangentAngle = Math.atan2(leftControlY - leftStartY, leftControlX - leftStartX);

    // Arrow head slightly before the curve start (backward along tangent)
    const arrowOffset = 4; // Distance to move arrow head backward
    const leftArrowX = leftStartX - Math.cos(leftTangentAngle) * arrowOffset;
    const leftArrowY = leftStartY - Math.sin(leftTangentAngle) * arrowOffset;

    ctx.save();
    ctx.translate(leftArrowX, leftArrowY);
    ctx.rotate(leftTangentAngle + Math.PI); // Add PI to point backwards
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // Text (slightly more transparent than arrows)
    const currentAlpha = ctx.globalAlpha;
    ctx.globalAlpha = currentAlpha * 0.8;
    ctx.fillText('click & drag', centerX, textY);
    ctx.globalAlpha = currentAlpha;

    // Right curved arrow
    ctx.save();
    ctx.translate(centerX + 45, arrowY);
    ctx.beginPath();

    // Use quadratic curve for smooth arc (mirrored from left)
    const rightStartX = 25;
    const rightStartY = -2;
    const rightEndX = 5;
    const rightEndY = 8;
    const rightControlX = 18;   // Control point for curve
    const rightControlY = 4;    // Reduced curve - midway between start and end Y

    ctx.moveTo(rightStartX, rightStartY);
    ctx.quadraticCurveTo(rightControlX, rightControlY, rightEndX, rightEndY);
    ctx.stroke();

    // Calculate tangent angle at the START of the curve
    // For quadratic curve, tangent at start point is from start point to control point
    const rightTangentAngle = Math.atan2(rightControlY - rightStartY, rightControlX - rightStartX);

    // Arrow head slightly before the curve start (backward along tangent)
    const rightArrowOffset = 4; // Distance to move arrow head backward
    const rightArrowX = rightStartX - Math.cos(rightTangentAngle) * rightArrowOffset;
    const rightArrowY = rightStartY - Math.sin(rightTangentAngle) * rightArrowOffset;

    ctx.save();
    ctx.translate(rightArrowX, rightArrowY);
    ctx.rotate(rightTangentAngle + Math.PI); // Add PI to point backwards along the curve
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();

    ctx.restore();
}

// Mouse hover detection based on canvas halves
canvas.addEventListener('mousemove', (event) => {
    if (!hasInteracted) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const canvasCenterX = rect.width / 2;

        if (mouseX < canvasCenterX) {
            // Hovering on left half
            leftTargetOpacity = 1;
            rightTargetOpacity = 0;
        } else {
            // Hovering on right half
            leftTargetOpacity = 0;
            rightTargetOpacity = 1;
        }
    }
});

canvas.addEventListener('mouseleave', () => {
    leftTargetOpacity = 0;
    rightTargetOpacity = 0;
});

// Lighting
const ambientLight = new THREE.AmbientLight(0x303030);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(2, 10, 10); // Centered on x-axis
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20; // Widened to cover both spheres
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
// Improve shadow quality
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.normalBias = 0.02;
scene.add(directionalLight);

/**
 * Creates a sphere with tangent plane and inscribed norm ball
 * @param {Object} params - Configuration parameters
 * @param {THREE.Vector3} params.position - Position of sphere center
 * @param {string} params.normType - 'L2' for circle, 'L1' for diamond
 * @param {number} params.scale - Sphere radius
 * @param {number} params.normBallScale - Scale factor for norm ball size (default 1.0)
 * @returns {THREE.Group} Group containing all elements
 */
function createSphereSetup(params) {
    const { position, normType, scale = 4.5, normBallScale = 1 } = params;

    // Create a group to hold all elements
    // The group will be positioned at the sphere center for proper rotation
    const group = new THREE.Group();
    group.position.copy(position);

    // Create sphere at origin of group
    const sphereGeometry = new THREE.SphereGeometry(scale, 64, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x4169e1,
        shininess: 10,
        specular: 0x050505,
        transparent: false,
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 0, 0); // Sphere at group origin
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    group.add(sphere);

    // Calculate tangent point (relative to sphere center which is now at 0,0,0)
    const relativePoint = new THREE.Vector3(
        scale / Math.sqrt(2.5),
        scale / Math.sqrt(2.5),
        scale / Math.sqrt(5)
    );

    const tangentPoint = relativePoint.clone(); // No need to add position since we're relative to group origin

    // Create tangent plane
    const planeSize = scale;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize, 10, 10);
    const planeMaterial = new THREE.MeshPhongMaterial({
        color: 0xdc143c,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        shininess: 50
    });
    const tangentPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    tangentPlane.position.copy(tangentPoint);

    // Calculate normal (from sphere center at origin to tangent point)
    const normal = tangentPoint.clone().normalize();

    // Orient plane perpendicular to normal
    tangentPlane.lookAt(tangentPoint.clone().add(normal));
    tangentPlane.castShadow = true;
    tangentPlane.receiveShadow = true;
    group.add(tangentPlane);

    // Add point marker at tangent point
    const pointGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const pointMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x222222
    });
    const pointMarker = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMarker.position.copy(tangentPoint);
    group.add(pointMarker);

    // Add grid lines on tangent plane
    const gridHelper = new THREE.GridHelper(planeSize, 10, 0x880000, 0x660000);
    gridHelper.position.copy(tangentPoint);
    gridHelper.lookAt(tangentPoint.clone().add(normal));
    gridHelper.rotateX(Math.PI / 2);
    group.add(gridHelper);

    // Add inscribed norm ball
    const normBallRadius = (planeSize / 2.5) * normBallScale;
    const normBallOffset = 0.05; // Offset to avoid z-fighting
    const ballPosition = tangentPoint.clone().add(normal.clone().multiplyScalar(normBallOffset));

    if (normType === 'L2') {
        // L2-norm ball (circle) - inner filled disc
        const discGeometry = new THREE.CircleGeometry(normBallRadius - 0.06, 128);
        const discMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
        });
        const normBallDisc = new THREE.Mesh(discGeometry, discMaterial);
        normBallDisc.position.copy(ballPosition);
        normBallDisc.lookAt(ballPosition.clone().add(normal));
        group.add(normBallDisc);

        // Ring outline - thicker and smoother
        const ringGeometry = new THREE.RingGeometry(normBallRadius - 0.06, normBallRadius, 128);
        const ringMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const normBallRing = new THREE.Mesh(ringGeometry, ringMaterial);
        normBallRing.position.copy(ballPosition);
        normBallRing.lookAt(ballPosition.clone().add(normal));
        group.add(normBallRing);

    } else if (normType === 'L1') {
        // L1-norm ball (diamond/square rotated 45 degrees)
        const squareSize = normBallRadius * Math.sqrt(2);

        // Inner diamond (filled)
        const innerSquareSize = (normBallRadius - 0.06) * Math.sqrt(2);
        const innerShape = new THREE.Shape();
        innerShape.moveTo(0, innerSquareSize);  // Top vertex
        innerShape.lineTo(innerSquareSize, 0);  // Right vertex
        innerShape.lineTo(0, -innerSquareSize);  // Bottom vertex
        innerShape.lineTo(-innerSquareSize, 0);  // Left vertex
        innerShape.closePath();

        const discGeometry = new THREE.ShapeGeometry(innerShape);
        const discMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
        });
        const normBallDisc = new THREE.Mesh(discGeometry, discMaterial);
        normBallDisc.position.copy(ballPosition);
        normBallDisc.lookAt(ballPosition.clone().add(normal));
        group.add(normBallDisc);

        // Diamond border (thick outline using shape with hole)
        const outerShape = new THREE.Shape();
        outerShape.moveTo(0, squareSize);  // Top vertex
        outerShape.lineTo(squareSize, 0);  // Right vertex
        outerShape.lineTo(0, -squareSize);  // Bottom vertex
        outerShape.lineTo(-squareSize, 0);  // Left vertex
        outerShape.closePath();

        const holePath = new THREE.Path();
        holePath.moveTo(0, innerSquareSize);
        holePath.lineTo(innerSquareSize, 0);
        holePath.lineTo(0, -innerSquareSize);
        holePath.lineTo(-innerSquareSize, 0);
        holePath.closePath();
        outerShape.holes.push(holePath);

        const borderGeometry = new THREE.ShapeGeometry(outerShape);
        const borderMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const normBallBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        normBallBorder.position.copy(ballPosition);
        normBallBorder.lookAt(ballPosition.clone().add(normal));
        group.add(normBallBorder);
    }

    return group;
}

// Create left setup (L2-norm)
const leftSetup = createSphereSetup({
    position: new THREE.Vector3(-7, 1.5, -0.9),
    normType: 'L2',
    scale: 6  // Reduced from 7
});
// Set initial rotation
leftSetup.rotation.x = -0.027;
leftSetup.rotation.y = -0.2;
leftSetup.rotation.z = 0;
scene.add(leftSetup);

// Create right setup (L1-norm)
const rightSetup = createSphereSetup({
    position: new THREE.Vector3(7, 1.5, -0.9),
    normType: 'L1',
    scale: 6,  // Reduced from 7
    normBallScale: 0.75  // Smaller L1 ball
});
// Set initial rotation (same as left sphere - twin layout)
rightSetup.rotation.x = -0.05;
rightSetup.rotation.y = -0.75;
rightSetup.rotation.z = 0;
scene.add(rightSetup);

// Independent mouse controls for each setup
let isDragging = false;
let currentDragTarget = null;
let previousMousePosition = { x: 0, y: 0 };

// Raycaster for detecting which object is clicked
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('mousedown', (event) => {
    isDragging = true;

    // Calculate mouse position in normalized device coordinates
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Determine which setup was clicked
    raycaster.setFromCamera(mouse, camera);

    // Check intersection with left setup
    const leftIntersects = raycaster.intersectObjects(leftSetup.children, true);
    const rightIntersects = raycaster.intersectObjects(rightSetup.children, true);

    if (leftIntersects.length > 0) {
        currentDragTarget = leftSetup;
    } else if (rightIntersects.length > 0) {
        currentDragTarget = rightSetup;
    } else {
        currentDragTarget = null;
    }

    // Fade out cue on first interaction
    if (!hasInteracted && currentDragTarget) {
        hasInteracted = true;
        leftTargetOpacity = 0;
        rightTargetOpacity = 0;
    }

    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
});

canvas.addEventListener('mousemove', (event) => {
    if (isDragging && currentDragTarget) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        // Rotate the selected setup
        currentDragTarget.rotation.y += deltaX * 0.01;
        currentDragTarget.rotation.x += deltaY * 0.01;

        // Clamp x rotation to prevent excessive tilting
        currentDragTarget.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, currentDragTarget.rotation.x));

        previousMousePosition.x = event.clientX;
        previousMousePosition.y = event.clientY;
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    currentDragTarget = null;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    currentDragTarget = null;
});

// Touch controls for mobile
canvas.addEventListener('touchstart', (event) => {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        const rect = canvas.getBoundingClientRect();

        mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const leftIntersects = raycaster.intersectObjects(leftSetup.children, true);
        const rightIntersects = raycaster.intersectObjects(rightSetup.children, true);

        if (leftIntersects.length > 0) {
            currentDragTarget = leftSetup;
        } else if (rightIntersects.length > 0) {
            currentDragTarget = rightSetup;
        }

        previousMousePosition.x = touch.clientX;
        previousMousePosition.y = touch.clientY;
        isDragging = true;
    }
});

canvas.addEventListener('touchmove', (event) => {
    if (isDragging && currentDragTarget && event.touches.length === 1) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - previousMousePosition.x;
        const deltaY = touch.clientY - previousMousePosition.y;

        currentDragTarget.rotation.y += deltaX * 0.01;
        currentDragTarget.rotation.x += deltaY * 0.01;
        currentDragTarget.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, currentDragTarget.rotation.x));

        previousMousePosition.x = touch.clientX;
        previousMousePosition.y = touch.clientY;
        event.preventDefault();
    }
});

canvas.addEventListener('touchend', () => {
    isDragging = false;
    currentDragTarget = null;
});

// Window resize
window.addEventListener('resize', () => {
    const newWidth = Math.min(800, canvas.parentElement.clientWidth || 800);
    const newHeight = newWidth / aspectRatio;

    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);

    // Resize overlay canvas
    overlayCanvas.width = newWidth * window.devicePixelRatio;
    overlayCanvas.height = newHeight * window.devicePixelRatio;
    overlayCanvas.style.width = newWidth + 'px';
    overlayCanvas.style.height = newHeight + 'px';

    // Reset context after resize
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Update canvas dimensions for drawCue
    canvasWidth = newWidth;
    canvasHeight = newHeight;

    if (leftCueOpacity > 0.01 || rightCueOpacity > 0.01) drawCue();
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Animate cue opacities
    let needsRedraw = false;
    if (Math.abs(leftCueOpacity - leftTargetOpacity) > 0.01) {
        leftCueOpacity += (leftTargetOpacity - leftCueOpacity) * 0.1; // Smooth transition
        needsRedraw = true;
    }
    if (Math.abs(rightCueOpacity - rightTargetOpacity) > 0.01) {
        rightCueOpacity += (rightTargetOpacity - rightCueOpacity) * 0.1; // Smooth transition
        needsRedraw = true;
    }
    if (needsRedraw) {
        drawCue();
    }

    camera.lookAt(0, 1.5, -0.9); // Look at the actual midpoint between spheres
    renderer.render(scene, camera);
}

animate();
})(); // End of IIFE