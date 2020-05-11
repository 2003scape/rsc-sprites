const JagBuffer = require('@2003scape/rsc-archiver/src/jag-buffer');
const encodeSprite = require('./encode-sprite');
const { JagArchive } = require('@2003scape/rsc-archiver');

function compressSprites(sprites) {
    let indexLength = 0;
    const encodedSprites = new Map();

    for (const [name, sprite] of sprites.entries()) {
        const encoded = encodeSprite(sprite);
        encodedSprites.set(name, encoded);
        encoded.offset = indexLength;

        // 2 shorts for full width and height 1 byte for palette length
        indexLength += 5;

        // palette, 3 bytes per colour
        indexLength += ((encoded.palette.length - 1) * 3);

        // 2 sprite offset bytes, width and height shorts, index order byte
        indexLength += (encoded.frames.length * 7);
    }

    const archive = new JagArchive();
    const indexData = new JagBuffer(Buffer.alloc(indexLength));

    for (const [name, encoded] of encodedSprites) {
        const totalSpriteLength =
            encoded.frames.reduce((total, { colourIndex }) => {
                return total + colourIndex.length;
            }, 0);

        // the .dat file
        const spriteData =
            new JagBuffer(Buffer.alloc(totalSpriteLength + 2));
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

module.exports = compressSprites;
