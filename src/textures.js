const JagBuffer = require('@2003scape/rsc-archiver/src/jag-buffer');
const compressSprites = require('./compress-sprites');
const parseSprite = require('./parse-sprite');
const { JagArchive } = require('@2003scape/rsc-archiver');
const { createCanvas } = require('canvas');

// wall, floor and object textures for 3d models
class Textures {
    constructor({ textures }) {
        this.textures = textures;
        this.sprites = new Map();
    }

    addTextureSprite(name, indexData, spriteData) {
        if (this.sprites.has(name)) {
            return;
        }

        spriteData = new JagBuffer(spriteData);
        this.sprites.set(name, parseSprite(spriteData, indexData, 1)[0]);
    }

    loadArchive(buffer) {
        const archive = new JagArchive();
        archive.readArchive(buffer);

        const indexData = new JagBuffer(archive.getEntry('index.dat'));

        for (const { name, subName } of this.textures) {
            if (name && name.length) {
                const spriteData = archive.getEntry(`${name}.dat`);
                this.addTextureSprite(name, indexData, spriteData);
            }

            if (subName && subName.length) {
                const spriteData = archive.getEntry(`${subName}.dat`);
                this.addTextureSprite(subName, indexData, spriteData);
            }
        }
    }

    plotTexture(canvas, texture) {
        const { width, height } = canvas;
        const ctx = canvas.getContext('2d');

        const textureCtx = texture.getContext('2d');
        const texturePixels = textureCtx.getImageData(0, 0, width, height).data;

        for (let i = 0; i < texturePixels.length; i += 4) {
            const a = texturePixels[i + 3];

            if (a === 0) {
                continue;
            }

            const r = texturePixels[i];
            const g = texturePixels[i + 1];
            const b = texturePixels[i + 2];

            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);

            if (r === 0 && g === 255 && b === 0) {
                ctx.clearRect(x, y, 1, 1);
            } else {
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    getMergedTexture(name, subName) {
        const textureSprite = this.sprites.get(name);

        let { width, height } = textureSprite;
        const patternCanvas = createCanvas(width, height);
        this.plotTexture(patternCanvas, textureSprite);

        const subSprite = this.sprites.get(subName);
        width = Math.max(width, subSprite.width);
        height = Math.max(width, subSprite.height);

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const pattern = ctx.createPattern(textureSprite, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);

        this.plotTexture(canvas, subSprite);

        return canvas;
    }

    // grab the texture sprites corresponding to a specific texture ID in
    // config's texture definitions (name and subName), and assemble a rendered
    // texture.
    getTextureById(textureId) {
        const { name, subName } = this.textures[textureId];
        const textureSprite = this.sprites.get(name);

        if (!subName || !subName.length) {
            const { width, height } = textureSprite;
            const canvas = createCanvas(width, height);
            this.plotTexture(canvas, textureSprite);

            return canvas;
        }

        return this.getMergedTexture(name, subName);
    }

    toArchive() {
        return compressSprites(this.sprites);
    }
}

module.exports = Textures;
