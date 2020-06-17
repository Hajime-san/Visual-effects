import * as THREE from "../../../../node_modules/three";

let camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  geometry: THREE.BufferGeometry,
  material: THREE.PointsMaterial,
  textureLoader: THREE.TextureLoader,
  // mesh: THREE.Mesh,
  uvAnimation: FlipBook,
  time: THREE.Clock;

class FlipBook {
  private texture: THREE.Texture;
  private column: number;
  private row: number;
  private playingFrame: number;
  private numberOfFrame: number;
  private currentDelta: number;
  private currentIndex: number;
  constructor(
    texture: THREE.Texture, column: number, row: number, playingFrame: number, numberOfFrame?: number
  ) {
    this.texture = texture;
    this.column = column;
    this.row = row;
    this.playingFrame = playingFrame;
    this.numberOfFrame = numberOfFrame;

    this.texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    this.texture.repeat.set( 1 / this.column, 1 / this.row );

    this.currentDelta = 0;

    this.currentIndex = 0;

  }

  update( deltaTime: number ) {

    this.currentDelta += deltaTime;

    while (this.currentDelta > this.playingFrame) {
      this.currentDelta -= this.playingFrame;
      this.currentIndex++;

      if (this.currentIndex === this.numberOfFrame)
        this.currentIndex = 0;
        const currentColumn = this.currentIndex % this.column;
        this.texture.offset.x = currentColumn / this.column;
        const currentRow = Math.floor( this.currentIndex / this.column );
        this.texture.offset.y = currentRow / this.row;

    }
  };
}

const init = () => {
  const container = document.getElementById("canvas");
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 2000 );
  camera.position.z = 50;

  scene = new THREE.Scene();

  time = new THREE.Clock();


  geometry = new THREE.BufferGeometry();

  textureLoader = new THREE.TextureLoader();

  const texture = textureLoader.load("./assets/T_Smoke_SubUV.png");

  uvAnimation = new FlipBook( texture, 8, 8, 64, 70 );

  let vertices = [];

  for (let i = 0; i < 1; i++) {
    const x = 1;
    const y = 1;
    const z = 1;

    vertices.push(x, y, z);
  }

  geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices, 3));

  material = new THREE.PointsMaterial({
    size: 50,
    map: texture,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(geometry, material);

  scene.add(particles);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize, false);
};

const animate = () => {
  requestAnimationFrame(animate);

  const delta = time.getDelta();

  uvAnimation.update(1000 * delta);


  for (let i = 0; i < 10; i++) {
    geometry.attributes.position.setXYZ(i, Math.random() * 10 - 5, i + 10 , Math.random() * 10 - 5)

  }

  renderer.render(scene, camera);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

document.addEventListener("DOMContentLoaded", () => {
  init();
  animate();
});
