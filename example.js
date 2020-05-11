const fs = require('fs');
const { Config } = require('@2003scape/rsc-config');
const { EntitySprites, MediaSprites, Textures } = require('./src');

const config = new Config();
config.loadArchive(fs.readFileSync('./config85.jag'));

const entitySprites = new EntitySprites(config);
entitySprites.loadArchive(fs.readFileSync('./entity24.jag'));
entitySprites.loadArchive(fs.readFileSync('./entity24.mem'));

/*fs.writeFileSync('./entity.png',
    entitySprites.getSpritesByNpcId(41)[17].toBuffer());*/

//config.npcs.forEach(({ name }, npcId) => {
    const name = 'Tribesman2';
    const sprites = entitySprites.getSpritesByNpcId(421);

    sprites.forEach((canvas, angle) => {
        fs.writeFileSync(`${name}-${angle}.png`, canvas.toBuffer());
    });
//});

/*const mediaSprites = new MediaSprites(config);
mediaSprites.loadArchive(fs.readFileSync('./media58.jag'));

config.items.forEach(({ name }, i) => {
    const buffer = mediaSprites.getSpriteByItemId(i).toBuffer();
    fs.writeFileSync(`./${name}.png`, buffer);
});

fs.writeFileSync('./media59.jag', mediaSprites.toArchive());*/

/*const textures = new Textures(config);
textures.loadArchive(fs.readFileSync('./textures17.jag'));

config.textures.forEach(({ name, subName }, i) => {
    const buffer = textures.getTextureById(i).toBuffer();
    fs.writeFileSync(`./${name}-${subName}.png`, buffer);
});

fs.writeFileSync('./textures18.jag', textures.toArchive());*/
