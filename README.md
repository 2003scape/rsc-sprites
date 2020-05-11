# rsc-sprites
(de)serialize runescape classic entity, ui and texture images.

IMAGE COLLAGE

## install

    $ npm install @2003scape/rsc-sprites

## example
```javascript
```

## api
### entitySprites = new EntitySprites({ animations })
create a new entity sprite (de)serializer (for entity jag and mem files). these
are collections of frames for monster, character and equipment graphics.

### entitySprites.loadJag(buffer)
### entitySprites.loadMem(buffer)
prepare `.jag` and `.mem` buffers to be parsed. any sprites loaded with
`entitySprites.loadMem` will have `sprite.members = true`.

### entitySprites.parseArchives()
populate `entitySprites.sprites` with frames of
[canvas](https://github.com/Automattic/node-canvas) objects.

### entitySprites.getAnimationSprite(id, overlay?, skinColour?)

### entitySprites.toJag()
### entitySprites.toMem()
return an entities jag/mem archive.

### mediaSprites = new MediaSprites({ items, projectileSprite }, ui?)
create a new media sprite (de)serializer. these are images of interface items
(buttons, arrows) and inventory items. `ui` specifies the filenames, sprite
offsets and amounts for interface sprites
[hard-coded into the client](
https://github.com/2003scape/rsc-client/blob/master/src/mudclient.js#L4350):

```javascript
    // refers to "splat.dat"
    splat: {
        offset: 11,
        sprites: 3
    },
    // etc.
```

this defaults to the interface sprites found in `media58.jag` for
mudclient204 (`./res/media-offsets.json`).

### mediaSprites.loadArchive(buffer)
load and prepare a media jag archive buffer.

### mediaSprites.getSpriteById(id)
get a media sprite canvas by the id used in the client.

### mediaSprites.getSpriteByItemId(itemId)
get a colourized item sprite canvas based on its id (index in `config.items`).

## license
Copyright 2020  2003Scape Team

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the
Free Software Foundation, either version 3 of the License, or (at your option)
any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see http://www.gnu.org/licenses/.
