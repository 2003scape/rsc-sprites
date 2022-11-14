import SpriteArchive from './sprite-archive.js';
import { JagBuffer } from '@2003scape/rsc-archiver';

const MEDIA_58 = {
    inv1: 1,
    inv2: 6,
    bubble: 1,
    runescape: 1,
    splat: 3,
    icon: 8,
    hbar: 1,
    hbar2: 1,
    compass: 1,
    buttons: 2,
    scrollbar: 2,
    corners: 4,
    arrows: 2
};

// amount of inventory item sprites stored in each .dat
const ITEMS_PER_DAT = 30;

// UI and inventory item sprites
class MediaSprites extends SpriteArchive {
    constructor({ items, projectileSprite }, ui) {
        super();

        this.items = items;
        this.projectileSprite = projectileSprite;
        this.ui = ui && ui.length ? ui : MEDIA_58;

        // uncoloured item sprites
        this.itemSprites = [];
    }

    loadArchive(buffer) {
        super.loadArchive(buffer);

        // stores metadata about each sprite (width, height, offsets)
        const indexData = new JagBuffer(this.archive.getEntry('index.dat'));

        // add inventory, arrows, runescape logo, etc.
        for (const [name, sprites] of Object.entries(this.ui)) {
            const spriteData = new JagBuffer(
                this.archive.getEntry(`${name}.dat`)
            );

            const frames = this.parseSprite(spriteData, indexData, sprites);
            this.sprites.set(name, frames);
        }

        // add gnome ball, magic, arrow, etc. projectiles
        const spriteData = new JagBuffer(
            this.archive.getEntry('projectile.dat')
        );

        const frames = this.parseSprite(
            spriteData,
            indexData,
            this.projectileSprite
        );

        this.sprites.set('projectile', frames);

        // load the base sprites used for inventory items
        const itemSpriteCount =
            Math.max(...this.items.map((item) => item.sprite)) + 1;

        for (let i = 0; i < Math.ceil(itemSpriteCount / 30); i += 1) {
            const entryName = `objects${i + 1}.dat`;
            const spriteData = new JagBuffer(this.archive.getEntry(entryName));

            const frameCount =
                i * ITEMS_PER_DAT > itemSpriteCount
                    ? i * ITEMS_PER_DAT - itemSpriteCount
                    : ITEMS_PER_DAT;

            const frames = this.parseSprite(spriteData, indexData, frameCount);

            this.sprites.set(`objects${i + 1}`, frames);

            this.itemSprites.push(...frames);
        }
    }

    getSpriteByItemID(itemID) {
        const { sprite, colour } = this.items[itemID];
        const spriteCanvas = this.itemSprites[sprite];

        if (colour) {
            return this.colourizeSprite(spriteCanvas, colour);
        }

        return spriteCanvas;
    }
}

MediaSprites.MEDIA_58 = MEDIA_58;

export default MediaSprites;
