import { JagArchive } from '@2003scape/rsc-archiver';
import { cssColor, rgb2hex } from '@swiftcarrot/color-fns';

const DATA_URL_PREFIX = 'data:image/png;base64,';

function cssColorToInt(colour) {
    const { r, g, b } = cssColor(colour);

    return parseInt(rgb2hex(r, g, b).slice(1), 16);
}

function logAllProperties(obj) {
         if (obj == null) return; // recursive approach
         console.log(Object.getOwnPropertyNames(obj));
         logAllProperties(Object.getPrototypeOf(obj));

}

class SpriteArchive {
    constructor() {
        this.archive = new JagArchive();
        this.sprites = new Map();
    }

    async init() {
        await this.archive.init();

        if (typeof process !== 'undefined') {
            const { default: CanvasKitInit } = await import('canvaskit-wasm');
            this.CanvasKit = await CanvasKitInit();
        }
    }

    loadArchive(buffer) {
        this.archive.readArchive(buffer);
    }

    createCanvas(width, height) {
        let canvas;

        if (typeof process === 'undefined') {
            canvas = document.createElement('canvas');
        } else {
            canvas = this.CanvasKit.MakeCanvas(width, height);
        }

        // canvaskit doesn't set width/height properties
        canvas.width = width;
        canvas.height = height;

        canvas.imageSmoothingEnabled = false;

        return canvas;
    }

    drawImage(destination, source, x = 0, y = 0, width = 0, height = 0) {
        if (!width) {
            width = source.width;
        }

        if (!height) {
            height = source.height;
        }

        const destinationContext = destination.getContext('2d');

        if (typeof process === 'undefined') {
            destinationContext.drawImage(source, x, y);
        } else {
            // canvaskit-wasm needs this
            const image = this.CanvasKit.MakeImageFromEncoded(
                Buffer.from(
                    source.toDataURL().slice(DATA_URL_PREFIX.length),
                    'base64'
                )
            );

            destinationContext.drawImage(image, x, y, width, height);

            // no way to dispose image - this leaks ;\
            this.CanvasKit.Free(image);
        }
    }

    parseSprite(spriteData, indexData, frameCount) {
        indexData.caret = spriteData.getUShort();

        const fullWidth = indexData.getUShort();
        const fullHeight = indexData.getUShort();

        const palette = new Int32Array(indexData.getUByte());
        palette[0] = 0xff00ff;

        for (let i = 0; i < palette.length - 1; i++) {
            palette[i + 1] =
                (indexData.getUByte() << 16) +
                (indexData.getUByte() << 8) +
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

            const canvas = this.createCanvas(fullWidth, fullHeight);
            const context = canvas.getContext('2d');
            context.translate(spriteOffsetX, spriteOffsetY);

            for (let x = 0; x < spriteWidth; x++) {
                for (let y = 0; y < spriteHeight; y++) {
                    const colour =
                        palette[spriteColourIndex[x + y * spriteWidth]];

                    // treat #f0f as transparent
                    if (colour === 0xff00ff) {
                        continue;
                    }

                    context.fillStyle = `#${colour.toString(16).padStart(6, '0')}`;
                    context.fillRect(x, y, 1, 1);
                }
            }

            // TODO try changing frames to images for canvaskit-wasm, then
            // dispose original canvas

            frames.push(canvas);
        }

        return frames;
    }

    colourizeSprite(sprite, overlay, skin) {
        const canvas = this.createCanvas(sprite.width, sprite.height);
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

        this.drawImage(canvas, sprite);

        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < pixels.data.length; i += 4) {
            const a = pixels.data[i + 3];

            if (a === 0) {
                continue;
            }

            const r = pixels.data[i];
            const g = pixels.data[i + 1];
            const b = pixels.data[i + 2];

            if (skin) {
                if (r === 255 && g === b) {
                    pixels.data[i] = (r * skin.r) >> 8;
                    pixels.data[i + 1] = (g * skin.g) >> 8;
                    pixels.data[i + 2] = (b * skin.b) >> 8;
                }
            }

            if (overlay) {
                if (overlay.r === 0 && overlay.g === 0 && overlay.b === 0) {
                    continue;
                }

                if (r === g && g === b && r === b) {
                    pixels.data[i] = (r * overlay.r) >> 8;
                    pixels.data[i + 1] = (g * overlay.g) >> 8;
                    pixels.data[i + 2] = (b * overlay.b) >> 8;
                }
            }
        }

        context.putImageData(pixels, 0, 0);

        return canvas;
    }

    // encode a collection of frames with the same palette
    encodeSprite(frames) {
        frames = Array.isArray(frames) ? frames : [frames];

        const fullWidth = frames[0].width;
        const fullHeight = frames[0].height;

        const palette = [0xff00ff];
        const encodedFrames = [];

        for (const frame of frames) {
            const { offsetX, offsetY } = getOffset(frame);

            const trimmed = this.createCanvas(fullWidth, fullHeight);
            let trimmedCtx = trimmed.getContext('2d');

            this.drawImage(trimmed, frame);

            trimCanvas(trimmed);

            const size = trimmed.width * trimmed.height;

            const sprite = {
                width: trimmed.width,
                height: trimmed.height,
                offsetX,
                offsetY,
                colourIndex: new Uint8Array(size)
            };

            trimmedCtx = trimmed.getContext('2d');

            const trimmedData = trimmedCtx.getImageData(
                0,
                0,
                sprite.width,
                sprite.height
            ).data;

            for (let i = 0; i < trimmedData.length; i += 4) {
                const r = trimmedData[i];
                const g = trimmedData[i + 1];
                const b = trimmedData[i + 2];
                const a = trimmedData[i + 3];

                const colour =
                    a === 0
                        ? 0xff00ff
                        : parseInt(rgb2hex(r, g, b).slice(1), 16);

                let colourIndex = palette.indexOf(colour);

                if (colourIndex === -1) {
                    colourIndex = palette.push(colour) - 1;
                }

                sprite.colourIndex[Math.floor(i / 4)] = colourIndex;
            }

            encodedFrames.push(sprite);
        }

        return {
            fullWidth,
            fullHeight,
            palette,
            frames: encodedFrames
        };
    }

    compressSprites(sprites) {
        let indexLength = 0;
        const encodedSprites = new Map();

        for (const [name, sprite] of sprites.entries()) {
            const encoded = encodeSprite(sprite);
            encodedSprites.set(name, encoded);
            encoded.offset = indexLength;

            // 2 shorts for full width and height 1 byte for palette length
            indexLength += 5;

            // palette, 3 bytes per colour
            indexLength += (encoded.palette.length - 1) * 3;

            // 2 sprite offset bytes, width and height shorts, index order byte
            indexLength += encoded.frames.length * 7;
        }

        const archive = new JagArchive();
        const indexData = new JagBuffer(Buffer.alloc(indexLength));

        for (const [name, encoded] of encodedSprites) {
            const totalSpriteLength = encoded.frames.reduce(
                (total, { colourIndex }) => {
                    return total + colourIndex.length;
                },
                0
            );

            // the .dat file
            const spriteData = new JagBuffer(
                Buffer.alloc(totalSpriteLength + 2)
            );

            spriteData.writeUShort(encoded.offset);

            // 4 bytes
            indexData.writeUShort(encoded.fullWidth);
            indexData.writeUShort(encoded.fullHeight);

            indexData.writeUByte(encoded.palette.length);

            for (const colour of encoded.palette.slice(1)) {
                indexData.writeUByte((colour >> 16) & 0xff);
                indexData.writeUByte((colour >> 8) & 0xff);
                indexData.writeUByte(colour & 0xff);
            }

            for (const sprite of encoded.frames) {
                // 6 bytes
                indexData.writeUByte(sprite.offsetX);
                indexData.writeUByte(sprite.offsetY);
                indexData.writeUShort(sprite.width);
                indexData.writeUShort(sprite.height);

                // pixel order
                indexData.writeUByte(0);

                for (const index of sprite.colourIndex) {
                    spriteData.writeUByte(index);
                }
            }

            archive.putEntry(`${name}.dat`, spriteData.data);
        }

        archive.putEntry('index.dat', indexData.data);

        return archive.toArchive(true);
    }

    // returns [ { canvas, positions } ]
    createAtlas(greyMask = true, skinColours = []) {}

    toArchive() {
        return this.compressSprites(this.sprites);
    }
}

export default SpriteArchive;
