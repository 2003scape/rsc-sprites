import SpriteArchive from './sprite-archive.js';
import { JagBuffer } from '@2003scape/rsc-archiver';

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
class EntitySprites extends SpriteArchive {
    constructor({ animations, npcs }) {
        super();

        this.animations = animations;
        this.npcs = npcs;
    }

    loadArchive(buffer) {
        super.loadArchive(buffer);

        const indexData = getDataBuffer(this.archive, 'index');

        for (const { name, hasA, hasF } of this.animations) {
            if (this.sprites.has(name.toLowerCase())) {
                continue;
            }

            try {
                let spriteData = getDataBuffer(this.archive, name);
                const frames = this.parseSprite(spriteData, indexData, 15);

                if (hasA) {
                    spriteData = getDataBuffer(this.archive, `${name}a`);
                    frames.push(...this.parseSprite(spriteData, indexData, 3));
                }

                if (hasF) {
                    spriteData = getDataBuffer(this.archive, `${name}f`);
                    frames.push(...this.parseSprite(spriteData, indexData, 9));
                }

                this.sprites.set(name.toLowerCase(), frames);
            } catch (e) {
                // probably members animations when we only loaded free archive
                continue;
            }
        }
    }

    // get an array of canvas objects for every angle of an animation
    getSpritesByAnimationID(id) {
        const animation = this.animations[id];

        if (!animation) {
            throw new RangeError(`animation ID ${id} not found`);
        }

        const { name, colour } = animation;

        const sprite = this.sprites.get(name.toLowerCase());

        if (!sprite) {
            throw new Error(`sprite "${name}" not found`);
        }

        return sprite.map((canvas) => {
            if (id > 7) {
                return this.colourizeSprite(canvas, colour);
            }

            return canvas;
        });
    }

    // turn an array of animation IDs into an array of canvases with each
    // being an angle of the assembled animations. colours is an object
    // with hair/torso/etc colours.
    assembleAnimationSprites(ids, colours = {}) {
        const animations = ids.map((id) => {
            return id !== null ? this.getSpritesByAnimationID(id) : null;
        });

        // an array of canvases of each angle
        const assembled = [];

        for (let angle = 0; angle < 17; angle += 1) {
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

                const canvas = assembled[angle]
                    ? assembled[angle]
                    : this.createCanvas(
                          spriteCanvas.width,
                          spriteCanvas.height
                      );

                const context = canvas.getContext('2d');
                const animationId = ids[order[i]];
                let colouredSprite = spriteCanvas;

                if (
                    animationId === 0 ||
                    animationId === 3 ||
                    animationId === 5 ||
                    animationId === 6 ||
                    animationId === 7
                ) {
                    colouredSprite = this.colourizeSprite(
                        spriteCanvas,
                        colours.hairColour,
                        colours.skinColour
                    );
                } else if (animationId === 1 || animationId === 4) {
                    colouredSprite = this.colourizeSprite(
                        spriteCanvas,
                        colours.topColour,
                        colours.skinColour
                    );
                } else if (animationId === 2) {
                    colouredSprite = this.colourizeSprite(
                        spriteCanvas,
                        colours.bottomColour,
                        colours.skinColour
                    );
                }

                this.drawImage(canvas, colouredSprite);

                assembled[angle] = canvas;
            }
        }

        return assembled;
    }

    getSpritesByNPCID(id) {
        const npc = this.npcs[id];

        const animationSprites = this.assembleAnimationSprites(
            npc.animations,
            npc
        );

        console.log('npcid', id, npc.width, npc.height);

        return animationSprites.map((canvas, angle) => {
            //const resized = this.createCanvas(npc.width, npc.height)
            //this.drawImage(resized, canvas, 0, 0, npc.width, npc.height);
            //return resized;
            return canvas;
        });
    }

    // toJag and toMem?
    toArchive() {
        const sprites = new Map();

        for (const [name, frames] of this.sprites.entries()) {
            if (frames.length >= 18) {
                sprites.set(`${name}a`, frames.slice(15, 18));
            }

            if (frames.length === 27) {
                sprites.set(`${name}f`, frames.slice(18, 27));
            }

            sprites.set(name, frames.slice(0, 15));
        }

        return this.compressSprites(sprites);
    }
}

export default EntitySprites;
