const { createCanvas } = require('canvas');
const { cssColor, rgb2hex } = require('@swiftcarrot/color-fns');

function cssColorToInt(colour) {
    const { r, g, b } = cssColor(colour);

    return parseInt(rgb2hex(r, g, b).slice(1), 16);
}

function colourizeSprite(sprite, overlay, skin) {
    const canvas = createCanvas(sprite.width, sprite.height);
    const context = canvas.getContext('2d');

    if (overlay) {
        overlay = cssColorToInt(overlay);

        overlay = {
            r: (overlay >> 16) & 0xff,
            g: (overlay >> 8) & 0xff,
            b: overlay & 0xff
        };
    }

    if (skin) {
        skin = cssColorToInt(skin);

        skin = {
            r: (skin >> 16) & 0xff,
            g: (skin >> 8) & 0xff,
            b: skin & 0xff
        };
    }

    context.drawImage(sprite, 0, 0);

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);

    for (i = 0; i < pixels.data.length; i += 4) {
        const a = pixels.data[i + 3];

        if (a === 0) {
            continue;
        }

        const r = pixels.data[i];
        const g = pixels.data[i + 1];
        const b = pixels.data[i + 2];

        if (skin) {
            if (r === 255 && g === b) {
                pixels.data[i] = (r * skin.r >> 8);
                pixels.data[i + 1] = (g * skin.g >> 8);
                pixels.data[i + 2] = (b * skin.b >> 8);
            }
        }

        if (overlay) {
            if (overlay.r === 0 && overlay.g === 0 && overlay.b === 0) {
                continue;
            }

            if (r === g && g === b && r === b) {
                pixels.data[i] = (r * overlay.r >> 8);
                pixels.data[i + 1] = (g * overlay.g >> 8);
                pixels.data[i + 2] = (b * overlay.b >> 8);
            }
        }
    }

    context.putImageData(pixels, 0, 0);

    return canvas;
}

module.exports = colourizeSprite;
