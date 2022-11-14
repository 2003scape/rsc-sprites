#!/usr/bin/env node

import { Config } from '@2003scape/rsc-config';
const fs = require('fs').promises;
const mkdirp = require('mkdirp-promise');
const path = require('path');
const pkg = require('../package');
const yargs = require('yargs');
const { EntitySprites, MediaSprites, Textures } = require('./');

async function dumpSprites(output, spriteMap) {
    for (let [name, sprites] of spriteMap.entries()) {
        sprites = Array.isArray(sprites) ? sprites : [sprites];

        if (sprites.length > 1) {
            await mkdirp(path.join(output, name));

            let index = 0;

            for (const sprite of sprites) {
                await fs.writeFile(
                    path.join(output, name, `${index}.png`),
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

                await mkdirp(output);
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
        'pack PNG file(s) into a sprites jag or mem archive',
        (yargs) => {},
        async (argv) => {}
    )
    .command('dump-items <config> <archive>')
    .command('dump-npcs <config> <archive>')
    .demandCommand().argv;
