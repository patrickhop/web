(function() { // IIFE to avoid variable conflicts with other Three.js scripts
    // Scene setup
    const canvas = document.getElementById('canvas-tangent-with-gradient');
    const scene = new THREE.Scene();

    // Set canvas dimensions to fit within text column
    const aspectRatio = 16 / 9;
    let canvasWidth = Math.min(800, canvas.parentElement.clientWidth || 800); // Max width 800px
    let canvasHeight = canvasWidth / aspectRatio;

    const camera = new THREE.PerspectiveCamera(
        75,
        aspectRatio,
        0.1,
        1000
    );
    camera.position.set(8, 5, 8);

    // Slightly lower the sphere on the canvas by lowering the group center's y coordinate
    const sphereCenter = new THREE.Vector3(-1.5, 0.0, -0.9); // was y=1.5, now y=0.7

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
    let cueOpacity = 0;
    let targetOpacity = 0;
    let hasInteracted = false;  // Track if user has dragged the pink arrow

    // Draw click & drag cue
    function drawCue() {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Skip drawing if fully transparent
        if (cueOpacity < 0.01) {
            ctx.restore();
            return;
        }

        // Position in top right
        const baseX = canvasWidth * 0.86;
        const baseY = canvasHeight * 0.25;

        ctx.save();
        ctx.strokeStyle = '#888888';
        ctx.fillStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = cueOpacity;

        // Text (slightly more transparent than arrows)
        ctx.globalAlpha = cueOpacity * 0.8;
        ctx.fillText('drag the pink arrow', baseX, baseY);
        ctx.globalAlpha = cueOpacity;

        // Upper arrow (points up and left)
        ctx.save();
        ctx.translate(baseX - 80, baseY - 40);
        ctx.beginPath();

        // Use quadratic curve for smooth arc
        const upperStartX = 15;
        const upperStartY = 15;
        const upperEndX = 0;        // Moved right from -5 to 0
        const upperEndY = -8;       // Moved up from -5 to -8
        const upperControlX = 10;   // Moved right from 6 to 10
        const upperControlY = 2;    // Slightly adjusted from 3 to 2

        ctx.moveTo(upperStartX, upperStartY);
        ctx.quadraticCurveTo(upperControlX, upperControlY, upperEndX, upperEndY);
        ctx.stroke();

        // Calculate tangent angle at the END of the curve
        // For quadratic curve, tangent at end point is from control point to end point
        const upperTangentAngle = Math.atan2(upperEndY - upperControlY, upperEndX - upperControlX);

        // Arrow head slightly past the end (forward along tangent)
        const upperArrowOffset = 3; // Distance to move arrow head forward
        const upperArrowX = upperEndX + Math.cos(upperTangentAngle) * upperArrowOffset;
        const upperArrowY = upperEndY + Math.sin(upperTangentAngle) * upperArrowOffset;

        ctx.save();
        ctx.translate(upperArrowX, upperArrowY);
        ctx.rotate(upperTangentAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-8, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.restore();

        // Lower arrow (points down and right)
        ctx.save();
        ctx.translate(baseX - 40 , baseY + 48);
        ctx.beginPath();

        // Use quadratic curve for smooth arc
        const lowerStartX = -8;     // Adjusted for proper length
        const lowerStartY = -18;    // Moved up to increase length
        const lowerEndX = 1;        // Shortened to match upper arrow
        const lowerEndY = 9;        // Shortened to match upper arrow
        const lowerControlX = -2;   // Control point closer to line (reduced curve)
        const lowerControlY = -5;   // Less curve - closer to straight line

        ctx.moveTo(lowerStartX, lowerStartY);
        ctx.quadraticCurveTo(lowerControlX, lowerControlY, lowerEndX, lowerEndY);
        ctx.stroke();

        // Calculate tangent angle at the END of the curve
        const lowerTangentAngle = Math.atan2(lowerEndY - lowerControlY, lowerEndX - lowerControlX);

        // Arrow head slightly past the end (forward along tangent)
        const lowerArrowOffset = 3; // Distance to move arrow head forward
        const lowerArrowX = lowerEndX + Math.cos(lowerTangentAngle) * lowerArrowOffset;
        const lowerArrowY = lowerEndY + Math.sin(lowerTangentAngle) * lowerArrowOffset;

        ctx.save();
        ctx.translate(lowerArrowX, lowerArrowY);
        ctx.rotate(lowerTangentAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-8, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.restore();

        ctx.restore();
        ctx.restore(); // Match the initial ctx.save()
    }

    // Mouse hover events for cue fade in/out
    canvas.addEventListener('mouseenter', () => {
        if (!hasInteracted) {
            targetOpacity = 1;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        targetOpacity = 0;
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x303030);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    // Improve shadow quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.normalBias = 0.02;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    // Create a group to hold all objects - positioned at sphere center for proper rotation
    const rotationGroup = new THREE.Group();
    rotationGroup.position.copy(sphereCenter);
    scene.add(rotationGroup);

    // Create sphere at origin of the group
    const scale = 7.5;
    const sphereGeometry = new THREE.SphereGeometry(scale, 64, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x4169e1,
        shininess: 10,  // Much lower shininess for matte appearance
        specular: 0x050505,  // Minimal specular reflection
        transparent: false,
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 0, 0);  // Sphere at group origin
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    rotationGroup.add(sphere);

    // Calculate tangent point on sphere (relative to group origin)
    const point = new THREE.Vector3(
        scale / Math.sqrt(2.5),
        scale / Math.sqrt(2.5),
        scale / Math.sqrt(5)
    );

    // Create tangent plane
    const planeSize = 5.75;  // Matched to sphere size
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize, 10, 10);
    const planeMaterial = new THREE.MeshPhongMaterial({
        color: 0xdc143c,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        shininess: 50
    });
    const tangentPlane = new THREE.Mesh(planeGeometry, planeMaterial);

    // Position and orient the tangent plane
    tangentPlane.position.copy(point);

    // Calculate normal at the point (for sphere, normal = normalized position from center)
    // Since sphere is now at origin of group, the normal is just the normalized point position
    const normal = point.clone().normalize();

    // Orient plane perpendicular to normal
    tangentPlane.lookAt(point.clone().add(normal));
    tangentPlane.castShadow = true;
    tangentPlane.receiveShadow = true;
    rotationGroup.add(tangentPlane);

    // Add point marker
    const pointGeometry = new THREE.SphereGeometry(0.19, 32, 32);  // Proportional to sphere size
    const pointMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x222222
    });
    const pointMarker = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMarker.position.copy(point);
    rotationGroup.add(pointMarker);

    // Add grid lines on tangent plane
    const gridHelper = new THREE.GridHelper(planeSize, 10, 0x880000, 0x660000);
    gridHelper.position.copy(point);
    gridHelper.lookAt(point.clone().add(normal));
    gridHelper.rotateX(Math.PI / 2);
    rotationGroup.add(gridHelper);

    // Add inscribed L1 norm ball (diamond)
    const normBallScale = 0.75; // Scale factor for norm ball
    const normBallRadius = (planeSize / 2.5) * normBallScale;
    const normBallOffset = 0.05; // Offset to avoid z-fighting
    const ballPosition = point.clone().add(normal.clone().multiplyScalar(normBallOffset));

    // Define separate planes for each arrow to control render order
    const greenArrowZOffset = normBallOffset + 0.001;
    const greenArrowPlanePosition = point.clone().add(normal.clone().multiplyScalar(greenArrowZOffset));
    const pinkArrowZOffset = normBallOffset + 0.002; // Slightly more than the green arrow
    const pinkArrowPlanePosition = point.clone().add(normal.clone().multiplyScalar(pinkArrowZOffset));

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
    rotationGroup.add(normBallDisc);

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
    rotationGroup.add(normBallBorder);

    // Add green arrow from center to corner of diamond
    // Point to the bottom vertex of the diamond
    const cornerOffset = new THREE.Vector3(0, -innerSquareSize, 0);

    // Transform corner position to match the plane's orientation
    const quaternion = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(ballPosition.clone().add(normal), ballPosition, new THREE.Vector3(0, 1, 0));
    quaternion.setFromRotationMatrix(lookAtMatrix);
    cornerOffset.applyQuaternion(quaternion);

    // Create custom thick arrow, starting from the slightly elevated green arrow plane
    const arrowStart = greenArrowPlanePosition.clone();
    const arrowEnd = greenArrowPlanePosition.clone().add(cornerOffset);
    const arrowDirection = arrowEnd.clone().sub(arrowStart);
    const arrowLength = arrowDirection.length();
    arrowDirection.normalize();

    // Create arrow group (make it accessible for updates)
    const arrowGroup = new THREE.Group();
    const shaftRadius = 0.04;  // Thicker shaft
    const headRadius = 0.20;  // Wide head base
    const arrowMaterial = new THREE.MeshPhongMaterial({
        color: 0x008000,  // Darker green
        emissive: 0x004400  // Slight glow
    });

    // Create a flat plane for the arrow shaft
    const shaftLength = arrowLength * 0.7;
    const shaftGeometry = new THREE.PlaneGeometry(shaftRadius * 2, shaftLength);
    let greenShaft = new THREE.Mesh(shaftGeometry, arrowMaterial);

    // Create a flat triangle shape for the arrowhead
    const headLength = arrowLength * 0.3;
    const headShape = new THREE.Shape();
    const headWidth = headRadius * 1.5;
    headShape.moveTo(0, headLength); // Tip
    headShape.lineTo(-headWidth / 2, 0); // Bottom left
    headShape.lineTo(headWidth / 2, 0); // Bottom right
    headShape.closePath();

    const headGeometry = new THREE.ShapeGeometry(headShape);
    let greenHead = new THREE.Mesh(headGeometry, arrowMaterial);
    greenHead.position.y = shaftLength / 2;

    // Add shaft and head to arrow group
    arrowGroup.add(greenShaft);
    arrowGroup.add(greenHead);

    // Position and orient the arrow
    arrowGroup.position.copy(arrowStart);
    arrowGroup.position.add(arrowDirection.clone().multiplyScalar(shaftLength / 2));

    // Make arrow point in the right direction AND align its flatness with the plane
    const yAxis = arrowDirection.clone().normalize();
    const zAxisTemp = normal.clone().normalize(); // The plane's normal
    const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxisTemp).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize(); // Re-orthogonalize
    const rotationMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    arrowGroup.setRotationFromMatrix(rotationMatrix);

    rotationGroup.add(arrowGroup);

    // Add pink arrow
    const pinkArrowStart = pinkArrowPlanePosition.clone();
    const pinkArrowGroup = new THREE.Group();
    const pinkShaftRadius = 0.04;
    const pinkHeadRadius = 0.20;
    const pinkArrowMaterial = new THREE.MeshPhongMaterial({
        color: 0xff69b4,
        emissive: 0x660033
    });
    let pinkShaft = new THREE.Mesh(); // Placeholder, will be replaced by update function
    let pinkHead = new THREE.Mesh(); // Placeholder, will be replaced by update function
    rotationGroup.add(pinkArrowGroup);

    // Set initial orientation
    rotationGroup.rotation.x = 0.1;
    rotationGroup.rotation.y = 0.1;
    rotationGroup.rotation.z = 0;

    // Set initial pink arrow position and length using the specified angle
    const initialAngle = -1.950072296176537; // The angle in radians
    updatePinkArrowPosition(Math.cos(initialAngle), Math.sin(initialAngle));

    // Pink arrow dragging controls
    let isDraggingPinkArrow = false;
    let pinkArrowAngle = 0;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Function to update pink arrow position and green arrow to nearest vertex
    function updatePinkArrowPosition(localX, localY) {
        // localX and localY are coordinates in the L1 ball's local coordinate system

        let x = localX;
        let y = localY;

        // Normalize the direction vector to a fixed length (L2 norm)
        const fixedLength = (innerSquareSize / 2) * 1.3;
        const currentLength = Math.sqrt(x * x + y * y);

        if (currentLength > 0.0001) {
            const scale = fixedLength / currentLength;
            x *= scale;
            y *= scale;
        } else {
            // Default direction if input is (0,0)
            x = fixedLength;
            y = 0;
        }

        // Calculate a normalized direction for green arrow alignment
        const dirX = x / fixedLength || 0;
        const dirY = y / fixedLength || 0;

        // Determine which vertex is closest to the pink arrow direction
        const vertices = [
            { x: 0, y: innerSquareSize },    // Top
            { x: innerSquareSize, y: 0 },    // Right
            { x: 0, y: -innerSquareSize },   // Bottom
            { x: -innerSquareSize, y: 0 }    // Left
        ];

        // Find the vertex with the highest dot product (most aligned)
        let bestVertex = vertices[0];
        let maxDot = dirX * vertices[0].x + dirY * vertices[0].y;

        for (let i = 1; i < vertices.length; i++) {
            const dot = dirX * vertices[i].x + dirY * vertices[i].y;
            if (dot > maxDot) {
                maxDot = dot;
                bestVertex = vertices[i];
            }
        }

        // Update green arrow to point to the best vertex
        const greenCornerOffset = new THREE.Vector3(bestVertex.x, bestVertex.y, 0);
        const greenQuaternion = new THREE.Quaternion();
        const greenLookAtMatrix = new THREE.Matrix4();
        greenLookAtMatrix.lookAt(ballPosition.clone().add(normal), ballPosition, new THREE.Vector3(0, 1, 0));
        greenQuaternion.setFromRotationMatrix(greenLookAtMatrix);
        greenCornerOffset.applyQuaternion(greenQuaternion);

        const newGreenArrowEnd = greenArrowPlanePosition.clone().add(greenCornerOffset);
        const newGreenArrowDirection = newGreenArrowEnd.clone().sub(greenArrowPlanePosition);
        const newGreenArrowLength = newGreenArrowDirection.length();
        newGreenArrowDirection.normalize();

        // Update green arrow geometry
        arrowGroup.remove(greenShaft);
        arrowGroup.remove(greenHead);

        const newGreenShaftLength = newGreenArrowLength * 0.7;
        const newGreenShaftGeometry = new THREE.PlaneGeometry(shaftRadius * 2, newGreenShaftLength);
        greenShaft = new THREE.Mesh(newGreenShaftGeometry, arrowMaterial);

        const newGreenHeadLength = newGreenArrowLength * 0.3;
        // Create a flat triangle shape for the arrowhead
        const headShape = new THREE.Shape();
        const headWidth = headRadius * 1.5; // Make the base wider than the cone radius
        headShape.moveTo(0, newGreenHeadLength); // Tip of the arrow
        headShape.lineTo(-headWidth / 2, 0);   // Bottom left corner
        headShape.lineTo(headWidth / 2, 0);    // Bottom right corner
        headShape.closePath();

        const newGreenHeadGeometry = new THREE.ShapeGeometry(headShape);
        greenHead = new THREE.Mesh(newGreenHeadGeometry, arrowMaterial);
        // We position the shape's origin relative to the shaft
        greenHead.position.y = newGreenShaftLength / 2;

        arrowGroup.add(greenShaft);
        arrowGroup.add(greenHead);

        // Update arrow position and rotation
        arrowGroup.position.copy(greenArrowPlanePosition);
        arrowGroup.position.add(newGreenArrowDirection.clone().multiplyScalar(newGreenShaftLength / 2));

        const yAxis_green = newGreenArrowDirection.clone().normalize();
        const zAxisTemp_green = normal.clone().normalize();
        const xAxis_green = new THREE.Vector3().crossVectors(yAxis_green, zAxisTemp_green).normalize();
        const zAxis_green = new THREE.Vector3().crossVectors(xAxis_green, yAxis_green).normalize();
        const rotationMatrix_green = new THREE.Matrix4().makeBasis(xAxis_green, yAxis_green, zAxis_green);
        arrowGroup.setRotationFromMatrix(rotationMatrix_green);

        // Update pink arrow endpoint
        const newEdgeOffset = new THREE.Vector3(x, y, 0);
        const quaternionNew = new THREE.Quaternion();
        const lookAtMatrixNew = new THREE.Matrix4();
        lookAtMatrixNew.lookAt(ballPosition.clone().add(normal), ballPosition, new THREE.Vector3(0, 1, 0));
        quaternionNew.setFromRotationMatrix(lookAtMatrixNew);
        newEdgeOffset.applyQuaternion(quaternionNew);

        const newPinkArrowEnd = pinkArrowPlanePosition.clone().add(newEdgeOffset);
        const newPinkArrowDirection = newPinkArrowEnd.clone().sub(pinkArrowStart);
        const newPinkArrowLength = newPinkArrowDirection.length();
        newPinkArrowDirection.normalize();

        // Update pink arrow shaft length
        const newPinkShaftLength = newPinkArrowLength * 0.7;

        // Update shaft geometry
        pinkArrowGroup.remove(pinkShaft);
        pinkArrowGroup.remove(pinkHead);

        const newPinkShaftGeometry = new THREE.PlaneGeometry(pinkShaftRadius * 2, newPinkShaftLength);
        pinkShaft = new THREE.Mesh(newPinkShaftGeometry, pinkArrowMaterial);

        const newPinkHeadLength = newPinkArrowLength * 0.3;
        // Create a flat triangle shape for the arrowhead
        const pinkHeadShape = new THREE.Shape();
        const pinkHeadWidth = pinkHeadRadius * 1.5;
        pinkHeadShape.moveTo(0, newPinkHeadLength); // Tip
        pinkHeadShape.lineTo(-pinkHeadWidth / 2, 0);   // Bottom left
        pinkHeadShape.lineTo(pinkHeadWidth / 2, 0);    // Bottom right
        pinkHeadShape.closePath();

        const newPinkHeadGeometry = new THREE.ShapeGeometry(pinkHeadShape);
        pinkHead = new THREE.Mesh(newPinkHeadGeometry, pinkArrowMaterial);
        pinkHead.position.y = newPinkShaftLength / 2;

        pinkArrowGroup.add(pinkShaft);
        pinkArrowGroup.add(pinkHead);

        // Update arrow position and rotation
        pinkArrowGroup.position.copy(pinkArrowStart);
        pinkArrowGroup.position.add(newPinkArrowDirection.clone().multiplyScalar(newPinkShaftLength / 2));

        const yAxis_pink = newPinkArrowDirection.clone().normalize();
        const zAxisTemp_pink = normal.clone().normalize();
        const xAxis_pink = new THREE.Vector3().crossVectors(yAxis_pink, zAxisTemp_pink).normalize();
        const zAxis_pink = new THREE.Vector3().crossVectors(xAxis_pink, yAxis_pink).normalize();
        const rotationMatrix_pink = new THREE.Matrix4().makeBasis(xAxis_pink, yAxis_pink, zAxis_pink);
        pinkArrowGroup.setRotationFromMatrix(rotationMatrix_pink);
    }

    canvas.addEventListener('mousedown', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Create a ray from camera through mouse position
        raycaster.setFromCamera(mouse, camera);

        // Check if we clicked on the tangent plane/norm ball area
        const intersects = raycaster.intersectObjects(rotationGroup.children, true);

        let clickedOnNormBallArea = false;
        for (let i = 0; i < intersects.length; i++) {
            const obj = intersects[i].object;
            if (obj.material && obj.material.color) {
                const color = obj.material.color.getHex();
                // Check if we clicked on the tangent plane (red) or norm ball (yellow)
                if (color === 0xdc143c || color === 0xffd700) {
                    clickedOnNormBallArea = true;
                    break;
                }
            }
        }

        if (clickedOnNormBallArea) {
            isDraggingPinkArrow = true;

            // Fade out cue on first interaction
            if (!hasInteracted) {
                hasInteracted = true;
                targetOpacity = 0;
            }

            // We need world coordinates for raycasting and transformations.
            // First, ensure the world matrix of the group is up-to-date.
            rotationGroup.updateWorldMatrix(true, false);

            // Transform the plane's defining vectors into world space
            const worldBallPosition = ballPosition.clone().applyMatrix4(rotationGroup.matrixWorld);
            const worldNormal = normal.clone().transformDirection(rotationGroup.matrixWorld);

            // Define the plane of the L1 norm ball in world space
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(worldNormal, worldBallPosition);

            // Find intersection of the mouse ray with this world-space plane
            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, intersection)) { // Check if intersection exists
                // Create a transformation object that mimics the L1 norm ball's world position and orientation
                const transformObject = new THREE.Object3D();
                transformObject.position.copy(worldBallPosition);
                transformObject.lookAt(worldBallPosition.clone().add(worldNormal));
                transformObject.updateMatrixWorld();

                // We also need the world position of the arrow's origin (the tangent point)
                const worldTangentPoint = point.clone().applyMatrix4(rotationGroup.matrixWorld);

                // Now, transform the world intersection point and world tangent point
                // into the L1 norm ball's local coordinate system.
                const localIntersection = transformObject.worldToLocal(intersection.clone());
                const localTangentPoint = transformObject.worldToLocal(worldTangentPoint.clone());

                // The correct direction in local space is the difference between these two local points.
                const localClickDir = localIntersection.clone().sub(localTangentPoint);

                // Update arrow to point in the click direction, with a fixed length
                updatePinkArrowPosition(localClickDir.x, localClickDir.y);
            }
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDraggingPinkArrow = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDraggingPinkArrow = false;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (isDraggingPinkArrow) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            // We need world coordinates for raycasting and transformations.
            rotationGroup.updateWorldMatrix(true, false);
            const worldBallPosition = ballPosition.clone().applyMatrix4(rotationGroup.matrixWorld);
            const worldNormal = normal.clone().transformDirection(rotationGroup.matrixWorld);

            // Define the plane of the L1 norm ball in world space
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(worldNormal, worldBallPosition);

            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, intersection)) {
                // Create a transformation object that mimics the L1 norm ball's world orientation
                const transformObject = new THREE.Object3D();
                transformObject.position.copy(worldBallPosition);
                transformObject.lookAt(worldBallPosition.clone().add(worldNormal));
                transformObject.updateWorldMatrix();

                // Get world position of the arrow's origin
                const worldTangentPoint = point.clone().applyMatrix4(rotationGroup.matrixWorld);

                // Transform world points to the L1 ball's local space
                const localIntersection = transformObject.worldToLocal(intersection.clone());
                const localTangentPoint = transformObject.worldToLocal(worldTangentPoint.clone());
                const localMouseDir = localIntersection.clone().sub(localTangentPoint);

                // Update arrow position to the fixed-length position
                updatePinkArrowPosition(localMouseDir.x, localMouseDir.y);
            }
        }
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

        if (cueOpacity > 0.01) drawCue();
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Animate cue opacity
        if (Math.abs(cueOpacity - targetOpacity) > 0.01) {
            cueOpacity += (targetOpacity - cueOpacity) * 0.1; // Smooth transition
            drawCue();
        }

        // No auto-rotation, no smooth rotation: only update from drag
        camera.lookAt(sphereCenter); // Look at the sphere's center
        renderer.render(scene, camera);
    }

    animate();
    })(); // End of IIFE