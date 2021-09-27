export class Asset {
  constructor(textureFrame, width, height, animation) {
    this.textureFrame = textureFrame;
    this.width = width;
    this.height = height;
    this.animation = animation;
  }

  async load(_gfxLoader) {
    throw new Error("Asset.load() must be implemented");
  }

  getFrame(index) {
    if (this.animation) {
      return this.animation.frames[index].frame;
    }
    return this.textureFrame;
  }

  get textureKey() {
    return this.textureFrame.texture.key;
  }

  get frameKey() {
    return this.textureFrame.name;
  }

  get frames() {
    if (this.animation) {
      return this.animation.frames.map((f) => f.frame);
    }
    return [];
  }
}

class ResourceAsset extends Asset {
  constructor(textureFrame, width, height, animation, fileID, resourceID) {
    super(textureFrame, width, height, animation);
    this.fileID = fileID;
    this.resourceID = resourceID;
  }

  async load(gfxLoader) {
    return gfxLoader.loadResource(this.fileID, this.resourceID);
  }
}

class RawAsset extends Asset {
  constructor(textureFrame, path) {
    super(textureFrame, textureFrame.width, textureFrame.height, null);
    this.path = path;
  }

  async load(gfxLoader) {
    return gfxLoader.loadRaw(this.path);
  }
}

export class AssetFactory {
  constructor(scene, identifier) {
    this.scene = scene;
    this.identifier = identifier;
  }

  createResource(textureKey, frameKey, fileID, resourceID) {
    let tileCursor = this.createTileCursor(
      textureKey,
      frameKey,
      fileID,
      resourceID
    );

    if (tileCursor) {
      return tileCursor;
    }

    let textureAtlas = this.scene.textures.get(textureKey);
    let textureFrame = textureAtlas.get(frameKey);
    let width = textureFrame.realWidth;
    let height = textureFrame.realHeight;
    let animation = null;

    let canBeAnimated = fileID === 3 || fileID === 6;
    let isWideEnough = textureFrame.realWidth >= 32 * 4;

    if (canBeAnimated && isWideEnough) {
      let animationKey = this.getAnimationKey(textureKey, frameKey);

      let animationFrames = this.createAnimationFrames(
        textureAtlas,
        textureFrame,
        Math.floor(textureFrame.realWidth / 4),
        textureFrame.realHeight
      );

      animation = this.scene.game.anims.create({
        key: animationKey,
        frames: animationFrames,
        frameRate: 1.66,
        repeat: -1,
      });

      let sizeFrame = this.scene.textures.getFrame(
        animationFrames[0].key,
        animationFrames[0].frame
      );

      width = sizeFrame.width;
      height = sizeFrame.height;
    }

    return new ResourceAsset(
      textureFrame,
      width,
      height,
      animation,
      fileID,
      resourceID
    );
  }

  createTileCursor(textureKey, frameKey, fileID, resourceID) {
    if (fileID !== 2 || resourceID !== 124) {
      return null;
    }

    let textureAtlas = this.scene.textures.get(textureKey);
    let textureFrame = textureAtlas.get(frameKey);
    let animationKey = this.getAnimationKey(textureKey, frameKey);

    let animationFrames = this.createAnimationFrames(
      textureAtlas,
      textureFrame,
      Math.floor(textureFrame.realWidth / 5),
      textureFrame.realHeight
    );

    let animation = this.scene.game.anims.create({
      key: animationKey,
      frames: animationFrames,
      frameRate: 60,
      yoyo: true,
    });

    let sizeFrame = this.scene.textures.getFrame(
      animationFrames[0].key,
      animationFrames[0].frame
    );

    let width = sizeFrame.width;
    let height = sizeFrame.height;

    return new ResourceAsset(
      textureFrame,
      width,
      height,
      animation,
      fileID,
      resourceID
    );
  }

  createSpec(textureKey, frameKey, tileSpec) {
    let textureFrame = this.getTextureFrame(textureKey, frameKey);
    return new RawAsset(textureFrame, `specs/${tileSpec}.png`);
  }

  createEntity(textureKey, frameKey, entityType) {
    let textureFrame = this.getTextureFrame(textureKey, frameKey);
    return new RawAsset(textureFrame, `entities/${entityType}.png`);
  }

  createBlackTile(textureKey, frameKey) {
    let textureFrame = this.getTextureFrame(textureKey, frameKey);
    return new RawAsset(textureFrame, `black.png`);
  }

  createAnimationFrames(texture, frame, frameWidth, frameHeight) {
    let animationFrames = [];

    let x = frame.cutX;
    let y = frame.cutY;

    let cutWidth = frame.cutWidth;
    let cutHeight = frame.cutHeight;
    let sheetWidth = frame.realWidth;
    let sheetHeight = frame.realHeight;

    let row = Math.floor(sheetWidth / frameWidth);
    let column = Math.floor(sheetHeight / frameHeight);

    let leftPad = frame.x;
    let leftWidth = frameWidth - leftPad;

    let rightWidth = frameWidth - (sheetWidth - cutWidth - leftPad);

    let topPad = frame.y;
    let topHeight = frameHeight - topPad;

    let bottomHeight = frameHeight - (sheetHeight - cutHeight - topPad);

    let frameX = 0;
    let frameY = 0;
    let frameIndex = 0;

    for (let sheetY = 0; sheetY < column; sheetY++) {
      let topRow = sheetY === 0;
      let bottomRow = sheetY === column - 1;

      for (let sheetX = 0; sheetX < row; sheetX++) {
        let leftRow = sheetX === 0;
        let rightRow = sheetX === row - 1;
        let animationFrameKey = this.getAnimationFrameKey(
          frame.name,
          frameIndex
        );

        let sheetFrame = texture.add(
          animationFrameKey,
          frame.sourceIndex,
          x + frameX,
          y + frameY,
          frameWidth,
          frameHeight
        );

        animationFrames.push({
          key: texture.key,
          frame: animationFrameKey,
        });

        if (leftRow || topRow || rightRow || bottomRow) {
          let destX = leftRow ? leftPad : 0;
          let destY = topRow ? topPad : 0;

          let trimWidth = 0;
          let trimHeight = 0;

          if (leftRow) {
            trimWidth += frameWidth - leftWidth;
          }

          if (rightRow) {
            trimWidth += frameWidth - rightWidth;
          }

          if (topRow) {
            trimHeight += frameHeight - topHeight;
          }

          if (bottomRow) {
            trimHeight += frameHeight - bottomHeight;
          }

          let destWidth = frameWidth - trimWidth;
          let destHeight = frameHeight - trimHeight;

          sheetFrame.cutWidth = destWidth;
          sheetFrame.cutHeight = destHeight;

          sheetFrame.setTrim(
            frameWidth,
            frameHeight,
            destX,
            destY,
            destWidth,
            destHeight
          );
        }

        if (leftRow) {
          frameX += leftWidth;
        } else if (rightRow) {
          frameX += rightWidth;
        } else {
          frameX += frameWidth;
        }

        frameIndex++;
      }

      frameX = 0;

      if (topRow) {
        frameY += topHeight;
      } else if (bottomRow) {
        frameY += bottomHeight;
      } else {
        frameY += frameHeight;
      }
    }

    return animationFrames;
  }

  getTextureFrame(textureKey, frameKey) {
    let texture = this.scene.textures.get(textureKey);
    return texture.get(frameKey);
  }

  getAnimationKey(fileKey, frameKey) {
    return this.identifier + "." + fileKey + "." + frameKey;
  }

  getAnimationFrameKey(frameKey, index) {
    return frameKey + ".animationFrame." + index.toString();
  }
}
