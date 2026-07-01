export function loadImage(file) {
    const objectUrl = URL.createObjectURL(file);
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            resolve({
                element: image,
                fileName: file.name,
                objectUrl,
            });
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Failed to load image: ${file.name}`));
        };
        image.src = objectUrl;
    });
}
export function drawPlaceholder(context, message, accent = "#5a6870") {
    const { canvas } = context;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f6f2ec";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(31, 42, 46, 0.12)";
    context.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    context.fillStyle = accent;
    context.font = '600 15px "Space Grotesk", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(message, canvas.width / 2, canvas.height / 2);
}
export function drawSourcePreview(context, image) {
    const { canvas } = context;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f6f2ec";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const offsetX = (canvas.width - width) / 2;
    const offsetY = (canvas.height - height) / 2;
    context.drawImage(image, offsetX, offsetY, width, height);
}
export function drawPatternPreview(context, pattern) {
    var _a, _b, _c;
    const rows = pattern.length;
    const cols = (_b = (_a = pattern[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    if (rows === 0 || cols === 0) {
        drawPlaceholder(context, "No pixels");
        return;
    }
    const offscreen = document.createElement("canvas");
    offscreen.width = cols;
    offscreen.height = rows;
    const offscreenContext = offscreen.getContext("2d");
    if (!offscreenContext) {
        throw new Error("2D context not supported");
    }
    const imageData = offscreenContext.createImageData(cols, rows);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const index = (y * cols + x) * 4;
            const active = ((_c = pattern[y]) === null || _c === void 0 ? void 0 : _c[x]) === 1;
            imageData.data[index] = active ? 36 : 246;
            imageData.data[index + 1] = active ? 49 : 242;
            imageData.data[index + 2] = active ? 58 : 236;
            imageData.data[index + 3] = 255;
        }
    }
    offscreenContext.putImageData(imageData, 0, 0);
    const { canvas } = context;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f6f2ec";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    const scale = Math.min(canvas.width / cols, canvas.height / rows);
    const drawWidth = cols * scale;
    const drawHeight = rows * scale;
    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;
    context.drawImage(offscreen, offsetX, offsetY, drawWidth, drawHeight);
}
export function rasterizeImage(image, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("2D context not supported");
    }
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
}
