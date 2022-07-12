#!/usr/bin/env node

const { Config } = require('@2003scape/rsc-config');
const fs = require('fs').promises;
const path = require('path');
const pkg = require('../package');
const yargs = require('yargs');
const { EntitySprites, MediaSprites, Textures } = require('./');
const compressSprites = require('./compress-sprites');
const { Image, createCanvas, loadImage } = require('canvas');

let fileNames = "a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,zz,zzz,zzzz".split(",");

async function dumpSprites(output, spriteMap) {
    for (let [name, sprites] of spriteMap.entries()) {
        sprites = Array.isArray(sprites) ? sprites : [sprites];
        if (sprites.length > 1) {
            fs.mkdir(path.join(output, name))

            let index = 0;

            for (const sprite of sprites) {
                await fs.writeFile(
                    path.join(output, name, `${fileNames[index]}.png`),
                    sprite.toBuffer()
                );

                index += 1;
            }
        } else {
            await fs.writeFile(
                path.join(output, `${name}.png`),
                sprites[0].toBuffer()
            );
        }
    }
}

async function createImage(path) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = err => reject(err);
        image.onload = () => resolve(image);
        image.src = path;
    })
}

async function toCanvas(path) {
    const image = await createImage(path);

    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    let loadedImage = await loadImage(path);
    context.drawImage(loadedImage, 0, 0)
    return canvas;
}

yargs
    .scriptName('rsc-sprites')
    .version(pkg.version)
    .command(
        'dump-sprites <config> <archive>',
        'dump sprites PNGs from entitiy, media or textures jag/mem archives',
        (yargs) => {
            yargs.positional('config', {
                description: 'config jag archive',
                type: 'string'
            });

            yargs.positional('archive', {
                description: 'entity, media or textures jag/mem archive',
                type: 'string'
            });

            yargs.option('type', {
                alias: 't',
                description:
                    'manually specify the archive type (entity, ' +
                    'media or textures)',
                type: 'string'
            });

            yargs.option('merge', {
                alias: 'm',
                description: 'also dump textures that rely on two textures',
                type: 'boolean'
            });

            yargs.option('output', {
                alias: 'o',
                description: 'directory to dump PNG files',
                type: 'string'
            });
        },
        async (argv) => {
            try {
                const config = new Config();
                config.loadArchive(await fs.readFile(argv.config));
                
                let spriteArchive;
                
                if (argv.type === 'entity' || /entity/i.test(argv.archive)) {
                    spriteArchive = new EntitySprites(config);
                } else if (
                    argv.type === 'media' ||
                    /media/i.test(argv.archive)
                ) {
                    spriteArchive = new MediaSprites(config);
                } else if (
                    argv.type === 'textures' ||
                    /textures/i.test(argv.archive)
                ) {
                    spriteArchive = new Textures(config);
                } else {
                    throw new Error(
                        'unable to determine archive type from filename'
                    );
                }

                spriteArchive.loadArchive(await fs.readFile(argv.archive));

                let output = argv.output;
                if (!output) {
                    const ext = path.extname(argv.archive);
                    output = `${path.basename(argv.archive, ext)}-png`;
                }

                fs.mkdir(output);

                await dumpSprites(output, spriteArchive.sprites);

                if (
                    argv.merge &&
                    spriteArchive.constructor.name === 'Textures'
                ) {
                    const mergedTextures = new Map();

                    for (const { name, subName } of config.textures) {
                        if (!subName || !subName.length) {
                            continue;
                        }

                        mergedTextures.set(
                            `${name}-${subName}`,
                            spriteArchive.getMergedTexture(name, subName)
                        );
                    }

                    await dumpSprites(output, mergedTextures);
                }
            } catch (e) {
                process.exitCode = 1;
                console.error(e);
            }
        }
    )
    .command(
        'pack-sprites <archive> <files..>',
        'pack PNG file(s) into a sprites jag archive',
        yargs => {
            yargs.positional('archive', {
                description: 'entity, media or textures jag/mem archive',
                type: 'string'
            });
            yargs.positional('files', {
                description: 'Dumped files to create a new archive'
            });
            yargs.positional('type', {
                description: 'entity, media, or textures',
                type: 'string'
            });
        },
        async argv => {
            const writeArchive = async (archive, filename) => {
                await fs.writeFile(filename, archive);
                };
            if (argv.type === 'entity' || /entity/i.test(argv.archive)) {
                try {
                    const ext = path.extname(argv.archive);
                    const archiveFileBase = argv.archive.split(ext)[0].replace(/[0-9]/g, '');
                    const archiveAddEdition = Number(argv.archive.split(ext)[0].replace(/\D/g,'')) + 1;
                    const newArchiveFileName = archiveFileBase + archiveAddEdition + ext;

                    let spriteMapToEncode = new Map();

                    for (const filename in argv.files) {
    
                        let subFolderFullName = argv.files[filename];
                        let subFolderPartialName = argv.files[filename].split("/")[1];
                        let subFolderValue = await fs.readdir(argv.files[filename]);
    
                        let canvasArray = [];

                        for(const png of subFolderValue) {
                            let pngFileLocation = subFolderFullName + "/" + png;
                            let newCanvas = await toCanvas(`${pngFileLocation}`);
    
                            canvasArray.push(newCanvas);
                        }
                        spriteMapToEncode.set(subFolderPartialName, canvasArray);
                    }

                    let spritesToEncode = compressSprites(spriteMapToEncode);

                    await writeArchive(spritesToEncode, `${newArchiveFileName}`);

                } catch (e) {
                    console.log(e);
                }
            }
        }
    )
    .command('dump-items <config> <archive>')
    .command('dump-npcs <config> <archive>')
    .demandCommand().argv;