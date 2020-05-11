const JagBuffer = require('@2003scape/rsc-archiver/src/jag-buffer');
const colourizeSprite = require('./colourize-sprite');
const compressSprites = require('./compress-sprites');
const parseSprite = require('./parse-sprite');
const { JagArchive } = require('@2003scape/rsc-archiver');
const { createCanvas } = require('canvas');

const animationOrder = {
    front: [11, 2, 9, 7, 1, 6, 8, 0, 5, 3, 4], // angles 0-7
    frontReversed: [4, 11, 2, 9, 7, 1, 6, 8, 0, 5, 3], // angles 0-7 flipped
    back: [3, 4, 2, 9, 7, 1, 8, 0, 5, 6, 11], // angles 8-14
    backReversed: [4, 3, 2, 9, 7, 1, 8, 0, 5, 6, 11], // angles 8-14 flipped
    combat: [3, 11, 2, 9, 7, 1, 8, 0, 5, 6, 4] // angles 15+
};

function getDataBuffer(archive, name) {
    return new JagBuffer(archive.getEntry(`${name}.dat`));
}

// NPC, player and equipment sprites
class EntitySprites {
    constructor({ animations, npcs }) {
        this.animations = animations;
        this.npcs = npcs;

        // .sprites contains both free and mem keys linking to the same
        // collection
        this.sprites = new Map();
    }

    loadArchive(buffer) {
        const archive = new JagArchive();
        archive.readArchive(buffer);

        const indexData = getDataBuffer(archive, 'index');

        for (const { name, hasA, hasF } of this.animations) {
            if (this.sprites.has(name.toLowerCase())) {
                continue;
            }

            try {
                let spriteData = getDataBuffer(archive, name);
                const frames = parseSprite(spriteData, indexData, 15);

                if (hasA) {
                    spriteData = getDataBuffer(archive, `${name}a`);
                    frames.push(...parseSprite(spriteData, indexData, 3));
                }

                if (hasF) {
                    spriteData = getDataBuffer(archive, `${name}f`);
                    frames.push(...parseSprite(spriteData, indexData, 9));
                }

                this.sprites.set(name.toLowerCase(), frames);
            } catch (e) {
                // probably members animations when we only loaded free archive
                continue;
            }
        }
    }

    // get an array of canvas objects for every angle of an animation
    getSpritesByAnimationId(id) {
        const { name, colour } = this.animations[id];

        return this.sprites.get(name.toLowerCase()).map(canvas => {
            if (id > 7) {
                return colourizeSprite(canvas, colour);
            }

            return canvas;
        });
    }

    // turn an array of animation IDs into an array of canvases with each
    // being an angle of the assembled animations. colours is an object
    // with hair/torso/etc colours.
    assembleAnimationSprites(ids, colours = {}) {
        const animations = ids.map(id => {
            return id !== null ? this.getSpritesByAnimationId(id) : null;
        });

        let frameCount = 17;

        // an array of canvases of each angle
        const assembled = [];

        for (let angle = 0; angle < frameCount; angle += 1) {
            let order = animationOrder.front;

            if (angle > 7 && angle < 15) {
                order = animationOrder.back;
            } else if (angle > 14) {
                order = animationOrder.combat;
            }

            for (let i = 0; i < order.length; i += 1) {
                let spriteCanvas = animations[order[i]];

                if (!spriteCanvas) {
                    continue;
                }

                spriteCanvas = spriteCanvas[angle];

                if (!spriteCanvas) {
                    continue;
                }

                let canvas;

                if (assembled[angle]) {
                    canvas = assembled[angle];
                } else {
                    canvas =
                        createCanvas(spriteCanvas.width, spriteCanvas.height);
                }

                const ctx = canvas.getContext('2d');
                const animationId = ids[order[i]];
                let colouredSprite = spriteCanvas;

                if (animationId === 0 ||
                    animationId === 3 || animationId === 5 ||
                    animationId === 6 || animationId === 7) {
                    colouredSprite =
                        colourizeSprite(spriteCanvas, colours.hairColour,
                            colours.skinColour);
                } else if (animationId === 1 || animationId === 4) {
                    colouredSprite =
                        colourizeSprite(spriteCanvas, colours.topColour,
                            colours.skinColour);
                } else if (animationId === 2) {
                    colouredSprite =
                        colourizeSprite(spriteCanvas, colours.bottomColour,
                            colours.skinColour);
                }

                ctx.drawImage(colouredSprite, 0, 0);
                assembled[angle] = canvas;
            }
        }

        return assembled;
    }

    getSpritesByNpcId(id) {
        const npc = this.npcs[id];
        const animationSprites =
            this.assembleAnimationSprites(npc.animations, npc);

        return animationSprites.map((canvas, angle) => {
            const resizedCanvas = createCanvas(npc.width, npc.height);
            const ctx = resizedCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            if (angle < 15) {
                ctx.drawImage(canvas, 0, 0, npc.width, npc.height);
            } else {
                resizedCanvas.width = npc.width * 1.33;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(canvas, 0, 0, npc.width * 1.33, npc.height);
            }

            return resizedCanvas;
        });
    }

    toArchive() {
        return compressSprites(this.sprites);
    }
}

module.exports = EntitySprites;
