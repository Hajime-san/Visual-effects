import * as THREE from 'three';

export = FlipBook;

declare class FlipBook {

	constructor(texture: THREE.Texture, column: number, row: number, playingFrame: number, numberOfFrame?: number);

	update(deltaTime: number);

}
