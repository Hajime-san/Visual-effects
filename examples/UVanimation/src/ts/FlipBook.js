import * as THREE from 'three';

/**
 * UV animation controller
 * @class FlipBook
 * example
 *
 * const texture = textureLoader.load('foo.png');
 *
 * const animation = new FlipBook(texture, 4, 4, 30);
 *
 * const animate = () => {
 *
 *  requestAnimationFrame(animate);
 *
 *  const frame = delta.getDelta();
 *
 *  time += frame;
 *
 *  animation.update(time);
 *
 * };
 * @param texture three.js Texture object
 * @param column number of frame to horizontal direction
 * @param row number of frame to vertical direction
 * @param playngFrame add speed velovity for play animation
 * @param numberOfFrame set sum of frame when it different number between horizontal and vertical
 */
class FlipBook {
  constructor(texture, column, row, playingFrame, numberOfFrame?) {
    this.texture = texture;
    this.column = column;
    this.row = row;
    this.playingFrame = playingFrame;

    if (typeof numberOfFrame === 'undefined' && column === row) {
        this.numberOfFrame = column * row;
    } else {
        this.numberOfFrame = numberOfFrame;
    }

    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.repeat.set(1 / this.column, 1 / this.row);

    this.currentDelta = 0;

    this.currentIndex = 0;
  }

  update(deltaTime) {
    this.currentDelta += deltaTime;

    while (this.currentDelta > this.playingFrame) {
        this.currentDelta -= this.playingFrame;
        this.currentIndex += 1;

        if (this.currentIndex === this.numberOfFrame) this.currentIndex = 0;
        const currentColumn = this.currentIndex % this.column;
        this.texture.offset.x = currentColumn / this.column;

        const currentRow = Math.floor((this.currentIndex / this.column) * this.column);

        this.texture.offset.y = currentRow / this.row;
    }
  }
}

exports.default = FlipBook;
