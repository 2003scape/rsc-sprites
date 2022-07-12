const trimCanvas = require('trim-canvas').default;
const { createCanvas } = require('canvas');
const { rgb2hex } = require('@swiftcarrot/color-fns');

// get the position of the first coloured pixel in the image
function getOffset(frame) {
    const frameCtx = frame.getContext('2d');
    const frameData =
        frameCtx.getImageData(0, 0, frame.width, frame.height).data;

    let offsetX = frame.width;
    let offsetY = frame.height;

    for (let i = 0; i < frameData.length; i += 4) {
        const r = frameData[i];
        const g = frameData[i + 1];
        const b = frameData[i + 2];
        const a = frameData[i + 3];

        if (!r && !g && !b && !a) {
            continue;
        }

        const x = (i / 4) % frame.width;

        if (x < offsetX) {
            offsetX = x;
        }

        const y = Math.floor((i / 4) / frame.width);

        if (y < offsetY) {
            offsetY = y;
        }
    }

    return { offsetX, offsetY };
}

// encode a collection of frames with the same palette
function encodeSprite(frames) {
    frames = Array.isArray(frames) ? frames : [frames];
    const fullWidth = frames[0].width;
    const fullHeight = frames[0].height;
    const palette = [0xff00ff];
    const encodedFrames = [];

    for (const frame of frames) {
        const { offsetX, offsetY } = getOffset(frame);

        const trimmed = createCanvas(fullWidth, fullHeight);
        let trimmedCtx = trimmed.getContext('2d');
        trimmedCtx.drawImage(frame, 0, 0);
        trimCanvas(trimmed);

        const size = trimmed.width * trimmed.height;

        const sprite = {
            width: trimmed.width,
            height: trimmed.height,
            offsetX, offsetY,
            colourIndex: new Uint8Array(size)
        };

        trimmedCtx = trimmed.getContext('2d');
        const trimmedData =
            trimmedCtx.getImageData(0, 0, sprite.width, sprite.height).data;

        for (let i = 0; i < trimmedData.length; i += 4) {
            const r = trimmedData[i];
            const g = trimmedData[i + 1];
            const b = trimmedData[i + 2];
            const a = trimmedData[i + 3];

            let colour;

            if (a === 0) {
                colour = 0xff00ff;
            } else {
                colour = parseInt(rgb2hex(r, g, b).slice(1), 16);
            }

            let colourIndex = palette.indexOf(colour);

            if (colourIndex === -1) {
                colourIndex = palette.push(colour) - 1;
            }

            sprite.colourIndex[Math.floor(i / 4)] = colourIndex;
        }

        encodedFrames.push(sprite);
    }

    return {
        fullWidth, fullHeight,
        palette,
        frames: encodedFrames
    };
}

module.exports = encodeSprite;
