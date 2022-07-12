const JagBuffer = require('@2003scape/rsc-archiver/src/jag-buffer');
const encodeSprite = require('./encode-sprite');
const { JagArchive } = require('@2003scape/rsc-archiver');

function compressSprites(sprites) {
    let indexLength = 0;

    
    const encodedSprites = new Map();
    for (const [name, sprite] of sprites.entries()) {

        // A Sprite is an array of canvas objects
        if (name === "gobweap" || name === "skelweap" || name === "zombweap" || name === "eyepatch") {
            let spriteData = sprite.slice(0,15);
            const encodedRegular = encodeSprite(spriteData);
            
            encodedSprites.set(name, encodedRegular);
            
            encodedRegular.offset = indexLength;
            
            // 2 shorts (4 bytes) for full width and height 1 byte for palette length
            indexLength = indexLength + 2 + 2 + 1;
            // palette, 3 bytes per colour
            indexLength += ((encodedRegular.palette.length - 1) * 3);
            // 2 sprite offset bytes, width and height shorts, index order byte
            indexLength += (encodedRegular.frames.length * 7);
            

            let spriteDataFighting = sprite.slice(15,18);
            const encodedFighting = encodeSprite(spriteDataFighting);

            encodedSprites.set(`${name}a`, encodedFighting);

            encodedFighting.offset = indexLength;

            // 2 shorts (4 bytes) for full width and height 1 byte for palette length
            indexLength = indexLength + 2 + 2 + 1;
            // palette, 3 bytes per colour
            indexLength += ((encodedFighting.palette.length - 1) * 3);
            // 2 sprite offset bytes, width and height shorts, index order byte
            indexLength += (encodedFighting.frames.length * 7);



            let spriteDataAnimated = sprite.slice(18, 27);

            const encodedAnimated = encodeSprite(spriteDataAnimated);

            encodedSprites.set(`${name}f`, encodedAnimated);

            encodedAnimated.offset = indexLength;

            // 2 shorts (4 bytes) for full width and height 1 byte for palette length
            indexLength = indexLength + 2 + 2 + 1;
            // palette, 3 bytes per colour
            indexLength += ((encodedAnimated.palette.length - 1) * 3);
            // 2 sprite offset bytes, width and height shorts, index order byte
            indexLength += (encodedAnimated.frames.length * 7);
            count++;
        }
        if (name !== "crossbow"  && name !== "longbow" && name !== "sheep" && name !== "gobweap" && name !== "skelweap" && name !== "zombweap" && name !== "eyepatch") {
            let spriteData = sprite.slice(0,15);
            const encodedRegular = encodeSprite(spriteData);
            encodedSprites.set(name, encodedRegular);
            
            encodedRegular.offset = indexLength;
            
            // 2 shorts (4 bytes) for full width and height 1 byte for palette length
            indexLength = indexLength + 2 + 2 + 1;
            // palette, 3 bytes per colour
            indexLength += ((encodedRegular.palette.length - 1) * 3);
            // 2 sprite offset bytes, width and height shorts, index order byte
            indexLength += (encodedRegular.frames.length * 7);


            let spriteDataFighting = sprite.slice(15,18);
            
            const encodedFighting = encodeSprite(spriteDataFighting);

            encodedSprites.set(`${name}a`, encodedFighting);

            encodedFighting.offset = indexLength;

            // 2 shorts (4 bytes) for full width and height 1 byte for palette length
            indexLength = indexLength + 2 + 2 + 1;
            // palette, 3 bytes per colour
            indexLength += ((encodedFighting.palette.length - 1) * 3);
            // 2 sprite offset bytes, width and height shorts, index order byte
            indexLength += (encodedFighting.frames.length * 7);
        }
        if (name === "crossbow"  || name === "longbow" || name === "sheep") {
          let spriteData = sprite;
          const encodedRegular = encodeSprite(spriteData);

          encodedSprites.set(name, encodedRegular);

          encodedRegular.offset = indexLength;
          // 2 shorts for full width and height 1 byte for palette length
          indexLength += 5;
          // palette, 3 bytes per colour
          indexLength += (encodedRegular.palette.length - 1) * 3;
          // 2 sprite offset bytes, width and height shorts, index order byte
          indexLength += encodedRegular.frames.length * 7;
        }
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
