const { createCanvas } = require('canvas');

function parseSprite(spriteData, indexData, frameCount) {
    indexData.caret = spriteData.getUShort();

    const fullWidth = indexData.getUShort();
    const fullHeight = indexData.getUShort();

    const palette = new Int32Array(indexData.getUByte());
    palette[0] = 0xff00ff;

    for (let i = 0; i < palette.length - 1; i++) {
        palette[i + 1] =
            (indexData.getUByte() << 16) + (indexData.getUByte() << 8) +
            indexData.getUByte();
    }

    const frames = [];

    for (let i = 0; i < frameCount; i += 1) {
        // where to place the sprite on our fullWidth*fullHeight plane
        const spriteOffsetX = indexData.getUByte();
        const spriteOffsetY = indexData.getUByte();

        // the size of the sprite excluding offsets
        const spriteWidth = indexData.getUShort();
        const spriteHeight = indexData.getUShort();
        const size = spriteWidth * spriteHeight;

        // which order to read the pixels in
        const indexOrder = indexData.getUByte();

        // each value is an index of palette
        const spriteColourIndex = new Uint8Array(size);

        if (indexOrder === 0) {
            for (let i = 0; i < size; i++) {
                spriteColourIndex[i] = spriteData.getUByte();
            }
        } else {
            for (let x = 0; x < spriteWidth; x++) {
                for (let y = 0; y < spriteHeight; y++) {
                    spriteColourIndex[x + y * spriteWidth] =
                        spriteData.getUByte();
                }
            }
        }

        const canvas = createCanvas(fullWidth, fullHeight);
        const ctx = canvas.getContext('2d');
        ctx.translate(spriteOffsetX, spriteOffsetY);

        for (let x = 0; x < spriteWidth; x++) {
            for (let y = 0; y < spriteHeight; y++) {
                const colour = palette[spriteColourIndex[x + y * spriteWidth]];

                // treat #f0f as transparent
                if (colour === 0xff00ff) {
                    continue;
                }

                ctx.fillStyle = `#${colour.toString(16).padStart(6, '0')}`;
                ctx.fillRect(x, y, 1, 1);
            }
        }

        frames.push(canvas);
    }

    return frames;
}

module.exports = parseSprite;
