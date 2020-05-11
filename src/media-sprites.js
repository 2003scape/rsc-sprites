const JagBuffer = require('@2003scape/rsc-archiver/src/jag-buffer');
const colourizeSprite = require('./colourize-sprite');
const compressSprites = require('./compress-sprites');
const parseSprite = require('./parse-sprite');
const { JagArchive } = require('@2003scape/rsc-archiver');

const MEDIA_58 = require('../res/media58');

// amount of inventory item sprites stored in each .dat
const ITEMS_PER_DAT = 30;

// UI and inventory item sprites
class MediaSprites {
    constructor({ items, projectileSprite }, ui) {
        this.items = items;
        this.projectileSprite = projectileSprite;
        this.ui = ui && ui.length ? ui : MEDIA_58;

        this.itemSprites = [];
        this.sprites = new Map();
    }

    loadArchive(buffer) {
        const archive = new JagArchive();
        archive.readArchive(buffer);

        // stores metadata about each sprite (width, height, offsets)
        const indexData = new JagBuffer(archive.getEntry('index.dat'));

        // add inventory, arrows, runescape logo, etc.
        for (const [ name, sprites ] of Object.entries(this.ui)) {
            const spriteData = new JagBuffer(archive.getEntry(`${name}.dat`));
            const frames = parseSprite(spriteData, indexData, sprites);
            this.sprites.set(name, frames);
        }

        // add gnome ball, magic, arrow, etc. projectiles
        const spriteData = new JagBuffer(archive.getEntry('projectile.dat'));
        const frames = parseSprite(spriteData, indexData,
            this.projectileSprite);

        this.sprites.set('projectile', frames);

        // load the base sprites used for inventory items
        const itemSpriteCount = Math.max(
            ...this.items.map(item => item.sprite)) + 1;

        for (let i = 0; i < Math.ceil(itemSpriteCount / 30); i += 1) {
            const entryName = `objects${i + 1}.dat`;
            const spriteData = new JagBuffer(archive.getEntry(entryName));
            const frameCount =
                (i * ITEMS_PER_DAT) > itemSpriteCount ?
                (i * ITEMS_PER_DAT) - itemSpriteCount : ITEMS_PER_DAT;
            const frames = parseSprite(spriteData, indexData, frameCount);
            this.sprites.set(`objects${i + 1}`, frames);
            this.itemSprites.push(...frames);
        }
    }

    getSpriteByItemId(itemId) {
        const { sprite, colour } = this.items[itemId];
        const spriteCanvas = this.itemSprites[sprite];

        if (!colour) {
            return spriteCanvas;
        }

        return colourizeSprite(spriteCanvas, colour);
    }

    toArchive() {
        return compressSprites(this.sprites);
    }
}

MediaSprites.MEDIA_58 = MEDIA_58;

module.exports = MediaSprites;
