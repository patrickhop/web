// Switch to crisp SVG rendering (keep canvas hidden for backward compatibility)
const container = document.querySelector('.atomic-add-viz');
const canvas = document.getElementById('atomic-add-canvas');
if (canvas) { canvas.style.display = 'none'; }

const SVG_NS = 'http://www.w3.org/2000/svg';
const FIG_W = 800;
const FIG_H = 400;

const svg = document.createElementNS(SVG_NS, 'svg');
svg.setAttribute('viewBox', `0 0 ${FIG_W} ${FIG_H}`);
svg.setAttribute('width', '100%');
svg.setAttribute('height', 'auto');
container.appendChild(svg);

// Layer groups
const gBlocks = document.createElementNS(SVG_NS, 'g');
const gResult = document.createElementNS(SVG_NS, 'g');
const gArrow = document.createElementNS(SVG_NS, 'g');
svg.appendChild(gBlocks);
svg.appendChild(gResult);
svg.appendChild(gArrow);

// Constants
const NUM_BLOCKS = 6;
const BLOCK_SIZE = 60;
const BLOCK_RADIUS = 0;
const BLOCK_SPACING = 30;
const LINE_WIDTH = 2;
const ARROW_ANIMATE_SPEED = 0.015; // lower is slower.
const LAYER_GAP = 1; // gap between bars in the result block (px)

// Block colors (design palette)
const blockColors = [
    '#003856',
    '#0080DB',
    '#07ADF9',
    '#169E78',
    '#74B2D8',
    '#99C44A'
];

const colors = {
    resultDefault: '#DFE2E7',
    resultComplete: '#94a3b8',
    arrow: '#a9b5c7'
};



let blocks = [];
let blockOrder = [];
let resultBlock = {};

// Animation state
let timer = 0;
let currentBlockIndex = 0;
let isAnimating = false;
let arrowProgress = 0;
let currentArrow = null;
let pickedBlocks = new Set();

function initializeBlocks() {
    blocks = [];
    const totalWidth = NUM_BLOCKS * BLOCK_SIZE + (NUM_BLOCKS - 1) * BLOCK_SPACING;
    const startX = (FIG_W - totalWidth) / 2;
    const y = FIG_H * 0.15;

    for (let i = 0; i < NUM_BLOCKS; i++) {
        blocks.push({
            x: startX + i * (BLOCK_SIZE + BLOCK_SPACING),
            y: y,
            width: BLOCK_SIZE,
            height: BLOCK_SIZE,
            color: blockColors[i],
            name: `block${i}`,
            svgRect: null
        });
    }

    // Initialize result block
    resultBlock = {
        x: (FIG_W - BLOCK_SIZE) / 2,
        y: FIG_H * 0.55,
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
        layers: [],
        isComplete: false,
        bgRect: null,
        layersGroup: null,
        layerRects: []
    };

    // Create SVG rects for blocks
    blocks.forEach(block => {
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', block.x);
        rect.setAttribute('y', block.y);
        rect.setAttribute('width', block.width);
        rect.setAttribute('height', block.height);
        rect.setAttribute('rx', BLOCK_RADIUS);
        rect.setAttribute('fill', block.color);
        rect.setAttribute('class', 'block');
        // Smooth fade when opacity changes
        rect.style.transition = 'opacity 220ms ease-in-out';
        rect.style.opacity = '1';
        gBlocks.appendChild(rect);
        block.svgRect = rect;
    });

    // Create result block SVG elements
    resultBlock.bgRect = document.createElementNS(SVG_NS, 'rect');
    resultBlock.bgRect.setAttribute('x', resultBlock.x);
    resultBlock.bgRect.setAttribute('y', resultBlock.y);
    resultBlock.bgRect.setAttribute('width', resultBlock.width);
    resultBlock.bgRect.setAttribute('height', resultBlock.height);
    resultBlock.bgRect.setAttribute('rx', BLOCK_RADIUS);
    resultBlock.bgRect.setAttribute('fill', colors.resultDefault);
    gResult.appendChild(resultBlock.bgRect);

    resultBlock.layersGroup = document.createElementNS(SVG_NS, 'g');
    gResult.appendChild(resultBlock.layersGroup);
    // Group for white separators between colored layers (drawn above layers)
    resultBlock.separatorsGroup = document.createElementNS(SVG_NS, 'g');
    gResult.appendChild(resultBlock.separatorsGroup);
}

// No-op: rounded rect handled by SVG <rect rx>
function drawRoundedRect() {}

function drawBlock(block) {
    if (!block.svgRect) return;
    block.svgRect.setAttribute('x', block.x);
    block.svgRect.setAttribute('y', block.y);
    block.svgRect.setAttribute('width', block.width);
    block.svgRect.setAttribute('height', block.height);
    block.svgRect.setAttribute('rx', BLOCK_RADIUS);
    block.svgRect.setAttribute('fill', block.color);
    // Use CSS transition for smooth fade
    block.svgRect.style.opacity = pickedBlocks.has(block.name) ? '0.2' : '1';
}

function drawResultBlock() {
    // Update background
    resultBlock.bgRect.setAttribute('fill', resultBlock.isComplete ? colors.resultComplete : colors.resultDefault);

    const layerHeight = (resultBlock.height - LAYER_GAP * (NUM_BLOCKS - 1)) / NUM_BLOCKS;

    // Draw separators only between existing colored layers so grey area remains solid
    const coloredCount = resultBlock.layers.length;
    // Remove prior separators
    while (resultBlock.separatorsGroup.firstChild) {
        resultBlock.separatorsGroup.removeChild(resultBlock.separatorsGroup.firstChild);
    }
    for (let i = 0; i < Math.max(0, coloredCount - 1); i++) {
        const y = resultBlock.y + (i + 1) * layerHeight + i * LAYER_GAP;
        const sep = document.createElementNS(SVG_NS, 'rect');
        sep.setAttribute('x', resultBlock.x);
        sep.setAttribute('y', y);
        sep.setAttribute('width', resultBlock.width);
        sep.setAttribute('height', LAYER_GAP);
        sep.setAttribute('fill', '#ffffff');
        resultBlock.separatorsGroup.appendChild(sep);
    }
    // Ensure a rect exists for each layer; create with fade-in for new ones
    resultBlock.layers.forEach((color, index) => {
        let rect = resultBlock.layerRects[index];
        if (!rect) {
            rect = document.createElementNS(SVG_NS, 'rect');
            rect.setAttribute('x', resultBlock.x);
            rect.setAttribute('y', resultBlock.y + index * (layerHeight + LAYER_GAP));
            rect.setAttribute('width', resultBlock.width);
            rect.setAttribute('height', layerHeight);
            rect.setAttribute('fill', color);
            rect.style.transition = 'opacity 220ms ease-in-out';
            rect.style.opacity = '0';
            resultBlock.layersGroup.appendChild(rect);
            resultBlock.layerRects[index] = rect;
            // Trigger fade-in next frame
            requestAnimationFrame(() => { rect.style.opacity = '1'; });
        } else {
            rect.setAttribute('x', resultBlock.x);
            rect.setAttribute('y', resultBlock.y + index * (layerHeight + LAYER_GAP));
            rect.setAttribute('width', resultBlock.width);
            rect.setAttribute('height', layerHeight);
            rect.setAttribute('fill', color);
            rect.style.opacity = '1';
        }
    });

    // Remove any excess rects if layers decreased
    for (let i = resultBlock.layers.length; i < resultBlock.layerRects.length; i++) {
        const rect = resultBlock.layerRects[i];
        if (rect && rect.parentNode) {
            rect.parentNode.removeChild(rect);
        }
    }
    resultBlock.layerRects.length = resultBlock.layers.length;
}

// Reusable SVG elements for arrow
const arrowPath = document.createElementNS(SVG_NS, 'path');
arrowPath.setAttribute('fill', 'none');
arrowPath.setAttribute('stroke', colors.arrow);
arrowPath.setAttribute('stroke-width', '1.5');
gArrow.appendChild(arrowPath);

const arrowHead = document.createElementNS(SVG_NS, 'polygon');
arrowHead.setAttribute('points', '0,0 -8,-4 -8,4');
arrowHead.setAttribute('fill', colors.arrow);
gArrow.appendChild(arrowHead);

const arrowTextBg = document.createElementNS(SVG_NS, 'rect');
arrowTextBg.setAttribute('fill', 'white');
arrowTextBg.setAttribute('rx', '3');
gArrow.appendChild(arrowTextBg);

const arrowText = document.createElementNS(SVG_NS, 'text');
arrowText.textContent = 'add';
arrowText.setAttribute('font-size', '14');
arrowText.setAttribute('fill', colors.arrow);
arrowText.setAttribute('text-anchor', 'middle');
arrowText.setAttribute('dominant-baseline', 'middle');
gArrow.appendChild(arrowText);

function drawArrow(fromBlock, progress) {
    if (progress <= 0) {
        gArrow.setAttribute('display', 'none');
        return;
    }
    gArrow.removeAttribute('display');

    const startX = fromBlock.x + fromBlock.width / 2;
    const startY = fromBlock.y + fromBlock.height;
    const endX = resultBlock.x + resultBlock.width / 2;
    const endY = resultBlock.y;

    const textT = 0.3; // Where to place the text along the curve
    const controlX = (startX + endX) / 2;
    const controlY = (startY + endY) / 2 + 30;

    const t = Math.min(progress, 1);
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;

    arrowPath.setAttribute('d', `M ${startX} ${startY} Q ${controlX} ${controlY} ${x} ${y}`);

    if (progress >= textT) {
        const tt = textT;
        const textX = (1 - tt) * (1 - tt) * startX + 2 * (1 - tt) * tt * controlX + tt * tt * endX;
        const textY = (1 - tt) * (1 - tt) * startY + 2 * (1 - tt) * tt * controlY + tt * tt * endY;
        const bgWidth = 28;
        const bgHeight = 16;
        arrowTextBg.setAttribute('x', textX - bgWidth / 2);
        arrowTextBg.setAttribute('y', textY - bgHeight / 2 - 5);
        arrowTextBg.setAttribute('width', bgWidth);
        arrowTextBg.setAttribute('height', bgHeight);
        arrowText.setAttribute('x', textX);
        arrowText.setAttribute('y', textY - 5);
        arrowTextBg.removeAttribute('display');
        arrowText.removeAttribute('display');
    } else {
        // Hide text while arrow is too short to display label
        arrowTextBg.setAttribute('display', 'none');
        arrowText.setAttribute('display', 'none');
    }

    if (progress >= 0.95) {
        const angle = Math.atan2(endY - controlY, endX - controlX);
        arrowHead.setAttribute('transform', `translate(${endX}, ${endY}) rotate(${angle * 180 / Math.PI})`);
        arrowHead.removeAttribute('display');
    } else {
        arrowHead.setAttribute('display', 'none');
    }
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function startNewAnimation() {
    blockOrder = shuffleArray(blocks.map(b => b.name));
    currentBlockIndex = 0;
    resultBlock.layers = [];
    resultBlock.isComplete = false;
    if (resultBlock.layersGroup) {
        while (resultBlock.layersGroup.firstChild) {
            resultBlock.layersGroup.removeChild(resultBlock.layersGroup.firstChild);
        }
    }
    resultBlock.layerRects = [];
    pickedBlocks.clear();
    isAnimating = true;
    timer = 0;
    arrowProgress = 0;
    currentArrow = null;
}

function animate() {
    // Update all blocks
    blocks.forEach(block => drawBlock(block));

    // Update result block
    drawResultBlock();

    // Animation logic
    if (isAnimating) {
        timer++;

        if (currentBlockIndex < blockOrder.length) {
            const currentBlockName = blockOrder[currentBlockIndex];
            const currentBlock = blocks.find(b => b.name === currentBlockName);

            // Animate arrow
            if (timer > 30) {
                if (!currentArrow) {
                    currentArrow = currentBlock;
                }

                arrowProgress += ARROW_ANIMATE_SPEED;
                drawArrow(currentArrow, arrowProgress);

                // When arrow completes
                if (arrowProgress >= 1) {
                    // Add layer to result
                    resultBlock.layers.push(currentBlock.color);
                    pickedBlocks.add(currentBlockName);
                    // Reset for next block
                    currentBlockIndex++;
                    arrowProgress = 0;
                    currentArrow = null;
                    timer = 0;
                    // Hide arrow immediately so label doesn't linger
                    gArrow.setAttribute('display', 'none');
                }
            } else {
                // Not yet drawing arrow; ensure previous arrow is hidden
                gArrow.setAttribute('display', 'none');
            }
        } else {
            // Animation complete
            if (timer > 30) {
                resultBlock.isComplete = true;
            }
            if (timer > 120) {
                startNewAnimation();
            }
        }
    }

    requestAnimationFrame(animate);
}

// Initialize and start
initializeBlocks();
setTimeout(() => {
    startNewAnimation();
    animate();
}, 1000);