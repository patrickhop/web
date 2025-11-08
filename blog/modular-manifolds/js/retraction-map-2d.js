(function() { // IIFE to avoid variable conflicts
    // Get canvas and context
    const canvas = document.getElementById('canvas-retraction-map-2d');
    const ctx = canvas.getContext('2d');

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Set canvas dimensions with high-DPI support
    const aspectRatio = 16 / 9;
    const displayWidth = Math.min(800, canvas.parentElement?.clientWidth || 800);
    const displayHeight = displayWidth / aspectRatio;

    // Get device pixel ratio for crisp rendering on high-DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Use a higher resolution multiplier for even crisper rendering
    const resolutionMultiplier = devicePixelRatio;

    // Set the actual canvas size in memory (scaled up for high-DPI)
    canvas.width = displayWidth * resolutionMultiplier;
    canvas.height = displayHeight * resolutionMultiplier;

    // Scale the canvas back down using CSS
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    // Scale the drawing context so everything draws at the correct size
    ctx.scale(resolutionMultiplier, resolutionMultiplier);

    // Use display dimensions for calculations
    let canvasWidth = displayWidth;
    let canvasHeight = displayHeight;

    // Ensure canvas is properly centered and sized
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';

    // Ensure parent has relative positioning for overlay
    const canvasParent = canvas.parentElement;
    if (canvasParent) {
        canvasParent.style.position = 'relative';
    }

    // Create 2D overlay canvas for UI elements
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = displayWidth * devicePixelRatio;
    overlayCanvas.height = displayHeight * devicePixelRatio;
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.width = displayWidth + 'px';
    overlayCanvas.style.height = displayHeight + 'px';
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.style.zIndex = '10'; // Ensure overlay is on top

    if (canvasParent) {
        canvasParent.appendChild(overlayCanvas);
    }

    const overlayCtx = overlayCanvas.getContext('2d');
    overlayCtx.scale(devicePixelRatio, devicePixelRatio);

    // Hover state for fade effect
    let cueOpacity = 0;
    let targetOpacity = 0;
    let hasInteracted = false;  // Track if user has clicked and dragged

    // Colors matching the 3D figure
    const colors = {
        sphere: '#4169e1',          // Royal blue
        tangent_plane: '#dc143c',   // Crimson red
        tangent_arrow: '#0dcd08',   // Green arrow
        radial_lines: '#ffd700',    // Yellow
        retract_arrow: '#a259e6',   // Purple
        point: '#000000',           // Black
        text: '#333333',            // Dark gray
        grid: '#e0e0e0'             // Light gray
    };

    // Scene parameters
    let centerX = canvasWidth / 2;
    let centerY = canvasHeight * 0.6; // Shift figure down
    let radius = canvasHeight * 0.38; // Scale figure up to fill vertical space

    // Scale factor for proportional sizing
    let scaleFactor = Math.min(canvasWidth, canvasHeight) / 800;

    // Tangent point angle (in radians)
    let tangentAngle = 1.75*Math.PI;

    // Length of the tangent vector, stored as a ratio of the radius
    let tangentVectorRatio = 0.9;
    const initialTangentVectorRatio = tangentVectorRatio; // Store initial state for consistent scaling

    // The arrow length at which the arrowhead size saturates
    let tangentSaturationLength;

    // Mouse interaction state
    let isDragging = false;

    // Draw click & drag cue
    function drawCue() {
        overlayCtx.save();
        overlayCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCtx.scale(devicePixelRatio, devicePixelRatio);

        // Skip drawing if fully transparent
        if (cueOpacity < 0.01) {
            overlayCtx.restore();
            return;
        }

        // Position closer to the tangent plane
        const cueX = canvasWidth * 0.75;
        const cueY = canvasHeight * 0.18;

        overlayCtx.save();
        overlayCtx.strokeStyle = '#888888';
        overlayCtx.fillStyle = '#888888';
        overlayCtx.lineWidth = 2;
        overlayCtx.font = '14px system-ui, -apple-system, sans-serif';
        overlayCtx.textAlign = 'center';
        overlayCtx.textBaseline = 'middle';
        overlayCtx.globalAlpha = cueOpacity;

        // Calculate tangent direction
        const normalX = Math.cos(tangentAngle);
        const normalY = Math.sin(tangentAngle);
        const tangentX = -normalY;
        const tangentY = normalX;

        // Calculate a base position for both arrows to ensure they're co-linear
        const spacing = 35; // Space between arrow centers

        // Left arrow (parallel to tangent)
        const leftCenterX = cueX - spacing * 0.7; // Adjust for better centering
        const leftCenterY = cueY;

        overlayCtx.save();
        overlayCtx.translate(leftCenterX, leftCenterY);

        const arrowLength = 25;
        const startX = -arrowLength/2 * tangentX;
        const startY = -arrowLength/2 * tangentY;
        const endX = arrowLength/2 * tangentX;
        const endY = arrowLength/2 * tangentY;

        // Draw arrow shaft
        overlayCtx.beginPath();
        overlayCtx.moveTo(startX, startY);
        overlayCtx.lineTo(endX, endY);
        overlayCtx.stroke();

        // Arrow head at start (pointing backward)
        const arrowAngle = Math.atan2(tangentY, tangentX);
        const headOffset = 3; // Move arrow head outward
        const headX = startX - tangentX * headOffset;
        const headY = startY - tangentY * headOffset;

        overlayCtx.save();
        overlayCtx.translate(headX, headY);
        overlayCtx.rotate(arrowAngle + Math.PI);
        overlayCtx.beginPath();
        overlayCtx.moveTo(0, 0);
        overlayCtx.lineTo(-8, -4);
        overlayCtx.lineTo(-8, 4);
        overlayCtx.closePath();
        overlayCtx.fill();
        overlayCtx.restore();

        overlayCtx.restore();

        // Text below arrows
        overlayCtx.globalAlpha = cueOpacity * 0.8;
        overlayCtx.fillText('click & drag', cueX, cueY + 25);
        overlayCtx.globalAlpha = cueOpacity;

        // Right arrow (parallel to tangent, opposite direction)
        // Position along the same line as left arrow with more spacing
        const rightCenterX = leftCenterX + spacing * 1.8 * tangentX;
        const rightCenterY = leftCenterY + spacing * 1.8 * tangentY;

        overlayCtx.save();
        overlayCtx.translate(rightCenterX, rightCenterY);

        // Draw arrow shaft (reversed direction)
        overlayCtx.beginPath();
        overlayCtx.moveTo(-startX, -startY);
        overlayCtx.lineTo(-endX, -endY);
        overlayCtx.stroke();

        // Arrow head at start (pointing forward)
        const rightHeadOffset = 3; // Move arrow head outward
        const rightHeadX = -startX + tangentX * rightHeadOffset;
        const rightHeadY = -startY + tangentY * rightHeadOffset;

        overlayCtx.save();
        overlayCtx.translate(rightHeadX, rightHeadY);
        overlayCtx.rotate(arrowAngle);
        overlayCtx.beginPath();
        overlayCtx.moveTo(0, 0);
        overlayCtx.lineTo(-8, -4);
        overlayCtx.lineTo(-8, 4);
        overlayCtx.closePath();
        overlayCtx.fill();
        overlayCtx.restore();

        overlayCtx.restore();

        overlayCtx.restore();
        overlayCtx.restore();
    }

    // Set the saturation point based on the initial arrow configuration
    tangentSaturationLength = radius * initialTangentVectorRatio;

    // Calculate tangent point coordinates
    function getTangentPoint() {
        return {
            x: centerX + radius * Math.cos(tangentAngle),
            y: centerY + radius * Math.sin(tangentAngle)
        };
    }

    // Calculate tangent line endpoints
    function getTangentLine() {
        const point = getTangentPoint();
        const normalX = Math.cos(tangentAngle);
        const normalY = Math.sin(tangentAngle);
        const tangentX = -normalY;
        const tangentY = normalX;
        const lineLength = radius * 2.2;

        return {
            start: {
                x: point.x - tangentX * lineLength / 2,
                y: point.y - tangentY * lineLength / 2
            },
            end: {
                x: point.x + tangentX * lineLength / 2,
                y: point.y + tangentY * lineLength / 2
            }
        };
    }


        // Draw the manifold (circle)
    function drawManifold() {
        // Create radial gradient for 3D effect (light from top, shadow at bottom)
        const gradient = ctx.createRadialGradient(
            centerX, centerY - radius * 0.6, radius * 0.6,  // Light source (higher up, smaller radius)
            centerX, centerY, radius * 1.2  // Circle center and full radius
        );
        gradient.addColorStop(0, colors.sphere);  // Original blue in middle
        gradient.addColorStop(1, '#1a1a2e');  // Very dark blue/black at bottom

        // Draw filled circle with gradient
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw tangent line
    function drawTangentLine() {
        const tangent = getTangentLine();

        ctx.strokeStyle = colors.tangent_plane;
        ctx.lineWidth = 12 * scaleFactor;
        ctx.beginPath();
        ctx.moveTo(tangent.start.x, tangent.start.y);
        ctx.lineTo(tangent.end.x, tangent.end.y);
        ctx.stroke();
    }

    // Draw tangent point
    function drawTangentPoint() {
        const point = getTangentPoint();

        // Draw the main black point
        ctx.fillStyle = colors.point;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 13 * scaleFactor, 0, Math.PI * 2);
        ctx.fill();

        // Add white highlight/shading on the top-left, clipped to point boundary
        const highlightRadius = 30 * scaleFactor;
        const highlightOffset = 4 * scaleFactor;
        const gradient = ctx.createRadialGradient(
            point.x - highlightOffset, point.y - highlightOffset, 0,
            point.x - highlightOffset, point.y - highlightOffset, highlightRadius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        // Save context and set up clipping path
        ctx.save();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 13 * scaleFactor, 0, Math.PI * 2);
        ctx.clip();

        // Draw the highlight (will be clipped to the point boundary)
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x - highlightOffset, point.y - highlightOffset, highlightRadius, 0, Math.PI * 2);
        ctx.fill();

        // Restore context
        ctx.restore();
    }

    // Draw dashed lines from center
    function drawDashedLines() {
        const point = getTangentPoint();

        // Calculate arrow tip position
        const arrowLength = radius * tangentVectorRatio;
        const normalX = Math.cos(tangentAngle);
        const normalY = Math.sin(tangentAngle);
        const tangentX = -normalY;
        const tangentY = normalX;
        const arrowTipX = point.x + tangentX * arrowLength;
        const arrowTipY = point.y + tangentY * arrowLength;

        ctx.strokeStyle = colors.radial_lines;
        ctx.lineWidth = 5 * scaleFactor;
        ctx.setLineDash([5, 5]);

        // Line from center to tangent point
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();

        // Line from center to arrow tip
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(arrowTipX, arrowTipY);
        ctx.stroke();

        ctx.setLineDash([]);
    }

    // Draw green arrow from tangent point to end of tangent line
    function drawTangentArrow() {
        const point = getTangentPoint();

        // Calculate arrow endpoint (near the end of tangent line)
        const arrowLength = radius * tangentVectorRatio;
        const normalX = Math.cos(tangentAngle);
        const normalY = Math.sin(tangentAngle);
        const tangentX = -normalY;
        const tangentY = normalX;

        const endX = point.x + tangentX * arrowLength;
        const endY = point.y + tangentY * arrowLength;

        // Calculate physical length for arrowhead scaling
        const arrowPhysicalLength = Math.abs(arrowLength);

        // Scale arrowhead size based on arrow's length relative to saturation point
        const maxHeadLength = 40 * scaleFactor;
        // Ensure saturation length is not zero to avoid division by zero
        const saturationRatio = tangentSaturationLength > 0.01 ? arrowPhysicalLength / tangentSaturationLength : 1;
        const scaledHeadLength = maxHeadLength * Math.min(1, saturationRatio);


        // Draw arrow
        drawArrow(point.x, point.y, endX, endY, colors.tangent_arrow, 12 * scaleFactor, scaledHeadLength);
    }

    // Draw retraction arrow from green arrow tip to circle
    function drawRetractionArrow() {
        const point = getTangentPoint();

        // Calculate green arrow tip position
        const arrowLength = radius * tangentVectorRatio;
        const normalX = Math.cos(tangentAngle);
        const normalY = Math.sin(tangentAngle);
        const tangentX = -normalY;
        const tangentY = normalX;
        const arrowTipX = point.x + tangentX * arrowLength;
        const arrowTipY = point.y + tangentY * arrowLength;

        // Calculate retraction endpoint on circle (radial projection)
        const dx = arrowTipX - centerX;
        const dy = arrowTipY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const retractionX = centerX + (dx / distance) * radius;
        const retractionY = centerY + (dy / distance) * radius;

        // Calculate arrowhead size based on the *tangent* arrow's length
        const tangentArrowPhysicalLength = Math.abs(arrowLength);
        const maxHeadLength = 40 * scaleFactor;
        // Ensure saturation length is not zero to avoid division by zero
        const saturationRatio = tangentSaturationLength > 0.01 ? tangentArrowPhysicalLength / tangentSaturationLength : 1;
        const scaledHeadLength = maxHeadLength * Math.min(1, saturationRatio);


        // Draw retraction arrow with scaled head
        drawArrow(arrowTipX, arrowTipY, retractionX, retractionY, colors.retract_arrow, 12 * scaleFactor, scaledHeadLength);
    }

    // Helper function to draw an arrow
    function drawArrow(fromX, fromY, toX, toY, color, width, headLength) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 1) return; // Don't draw very short arrows

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;

        // Use provided head length or default to a scaled value
        const finalHeadLength = headLength !== undefined ? headLength : 30 * scaleFactor;
        const headAngle = Math.PI / 6;

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - finalHeadLength * Math.cos(angle - headAngle),
            toY - finalHeadLength * Math.sin(angle - headAngle)
        );
        ctx.lineTo(
            toX - finalHeadLength * Math.cos(angle + headAngle),
            toY - finalHeadLength * Math.sin(angle + headAngle)
        );
        ctx.closePath();
        ctx.fill();

        // Draw shaft line - stop it before the arrowhead tip
        const shaftGap = finalHeadLength * 0.4; // Gap between shaft end and arrowhead tip
        const shaftEndX = toX - shaftGap * Math.cos(angle);
        const shaftEndY = toY - shaftGap * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(shaftEndX, shaftEndY);
        ctx.stroke();
    }

    // Main drawing function
    function draw() {
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Animate cue opacity
        if (Math.abs(cueOpacity - targetOpacity) > 0.01) {
            cueOpacity += (targetOpacity - cueOpacity) * 0.1; // Smooth transition
            drawCue();
        } else if (cueOpacity > 0.01) {
            drawCue();
        }

        // Draw components
        drawManifold();
        drawTangentLine();
        drawDashedLines();
        drawRetractionArrow();
        drawTangentArrow();
        drawTangentPoint();
    }

    // Update tangent vector length based on mouse position
    function updateTangentVector(mouseX, mouseY) {
        const point = getTangentPoint();

        // Vector from tangent point to mouse
        const mouseVecX = mouseX - point.x;
        const mouseVecY = mouseY - point.y;

        // Tangent direction vector
        const tangentDirX = -Math.sin(tangentAngle);
        const tangentDirY = Math.cos(tangentAngle);

        // Project mouse vector onto tangent vector
        const dotProduct = mouseVecX * tangentDirX + mouseVecY * tangentDirY;

        // Clamp the length to be just beyond the visible tangent line
        const maxLen = radius * 1.1 * 1.05; // 5% further
        const newLength = Math.max(-maxLen, Math.min(dotProduct, maxLen));

        // Update the ratio instead of the raw length to ensure proper scaling on resize
        if (radius > 0.001) {
            tangentVectorRatio = newLength / radius;
        }
    }

    // Mouse hover events for cue fade in/out
    canvas.addEventListener('mouseenter', () => {
        if (!hasInteracted) {
            targetOpacity = 1;
            requestAnimationFrame(animate); // Restart animation
        }
    });

    canvas.addEventListener('mouseleave', () => {
        targetOpacity = 0;
        requestAnimationFrame(animate); // Restart animation
    });

    // Mouse event handlers
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        updateTangentVector(mouseX, mouseY);

        // Fade out cue on first interaction
        if (!hasInteracted) {
            hasInteracted = true;
            targetOpacity = 0;
        }

        draw(); // Force a redraw on initial click
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            updateTangentVector(mouseX, mouseY);
            draw(); // Force a redraw on drag
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        const newDisplayWidth = Math.min(800, canvas.parentElement?.clientWidth || 800);
        const newDisplayHeight = newDisplayWidth / aspectRatio;

        // Update canvas with high-DPI support
        const devicePixelRatio = window.devicePixelRatio || 1;
        const resolutionMultiplier = devicePixelRatio;
        canvas.width = newDisplayWidth * resolutionMultiplier;
        canvas.height = newDisplayHeight * resolutionMultiplier;
        canvas.style.width = newDisplayWidth + 'px';
        canvas.style.height = newDisplayHeight + 'px';

        // Reset and reapply scaling
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(resolutionMultiplier, resolutionMultiplier);

        // Ensure canvas stays properly centered and sized
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';

        // Resize overlay canvas
        overlayCanvas.width = newDisplayWidth * resolutionMultiplier;
        overlayCanvas.height = newDisplayHeight * resolutionMultiplier;
        overlayCanvas.style.width = newDisplayWidth + 'px';
        overlayCanvas.style.height = newDisplayHeight + 'px';

        // Reset overlay context after resize
        overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
        overlayCtx.scale(resolutionMultiplier, resolutionMultiplier);

        // Update scene parameters
        canvasWidth = newDisplayWidth;
        canvasHeight = newDisplayHeight;
        centerX = newDisplayWidth / 2;
        centerY = newDisplayHeight * 0.6; // Shift figure down
        radius = newDisplayHeight * 0.38; // Scale figure up
        scaleFactor = Math.min(newDisplayWidth, newDisplayHeight) / 800;

        // Recalculate saturation point on resize using the initial ratio for consistency
        tangentSaturationLength = radius * initialTangentVectorRatio;

        if (cueOpacity > 0.01) drawCue();
        draw(); // Redraw after resize
    });

    // Animation loop for smooth cue transitions
    function animate() {
        // Animate cue opacity
        if (Math.abs(cueOpacity - targetOpacity) > 0.01) {
            cueOpacity += (targetOpacity - cueOpacity) * 0.1;
            drawCue();
        }

        // Continue animation if opacity is changing or if cue is visible
        if (Math.abs(cueOpacity - targetOpacity) > 0.01 || cueOpacity > 0.01) {
            requestAnimationFrame(animate);
        }
    }

    // Initial draw
    draw();
    requestAnimationFrame(animate); // Start the animation loop
})();
