import { JagBuffer } from '@2003scape/rsc-archiver';

// wall, floor and object textures for 3d models
class Textures {
    constructor({ textures }) {
        this.textures = textures;
    }

    async init() {
        await this.archive.init();

        this.Canvas = await getCanvasConstructor();
    }

    addTextureSprite(name, indexData, spriteData) {
        if (this.sprites.has(name)) {
            return;
        }

        spriteData = new JagBuffer(spriteData);

        this.sprites.set(name, parseSprite(spriteData, indexData, 1)[0]);
    }

    loadArchive(buffer) {
        this.archive.readArchive(buffer);

        const indexData = new JagBuffer(this.archive.getEntry('index.dat'));

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

        const context = canvas.getContext('2d');
        const textureContext = texture.getContext('2d');

        const texturePixels = textureContext.getImageData(
            0,
            0,
            width,
            height
        ).data;

        for (let i = 0; i < texturePixels.length; i += 4) {
            const a = texturePixels[i + 3];

            if (a === 0) {
                continue;
            }

            const r = texturePixels[i];
            const g = texturePixels[i + 1];
            const b = texturePixels[i + 2];

            const x = (i / 4) % width;
            const y = Math.floor(i / 4 / width);

            if (r === 0 && g === 255 && b === 0) {
                context.clearRect(x, y, 1, 1);
            } else {
                context.fillStyle = `rgb(${r}, ${g}, ${b})`;
                context.fillRect(x, y, 1, 1);
            }
        }
    }

    getMergedTexture(name, subName) {
        const texture = this.sprites.get(name);

        let { width, height } = texture;
        const patternCanvas = this.createCanvas(width, height);

        this.plotTexture(patternCanvas, texture);

        const subTexture = this.sprites.get(subName);

        width = Math.max(width, subTexture.width);
        height = Math.max(width, subTexture.height);

        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');

        const pattern = context.createPattern(texture, 'repeat');

        context.fillStyle = pattern;
        context.fillRect(0, 0, width, height);

        this.plotTexture(canvas, subTexture);

        return canvas;
    }

    // grab the texture sprites corresponding to a specific texture ID in
    // config's texture definitions (name and subName), and assemble a rendered
    // texture.
    getTextureByID(textureID) {
        const { name, subName } = this.textures[textureID];
        const textureSprite = this.sprites.get(name);

        if (!subName || !subName.length) {
            const { width, height } = textureSprite;
            const canvas = createCanvas(width, height);

            this.plotTexture(canvas, textureSprite);

            return canvas;
        }

        return this.getMergedTexture(name, subName);
    }
}

export default Textures;
