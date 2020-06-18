import * as THREE from "../../../../node_modules/three";
import { OrbitControls } from ',./../../node_modules/three/examples/jsm/controls/OrbitControls'

let camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  geometry: THREE.BufferGeometry,
  material: THREE.PointsMaterial,
  textureLoader: THREE.TextureLoader,
  // mesh: THREE.Mesh,
  uvAnimation: FlipBook,
  time: THREE.Clock;

const frac = (float: number) => float % 1;

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

    if (typeof numberOfFrame === 'undefined' && column === row) {
      this.numberOfFrame = column * row;
    } else {
      this.numberOfFrame = numberOfFrame;
    }


    this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
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


        const currentRow = Math.floor( this.currentIndex / this.column * this.column );
        //const currentRow = Math.floor(this.currentIndex / this.column);

        this.texture.offset.y = currentRow / this.row;

    }
  };
}

const init = () => {
  const container = document.getElementById("canvas");
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 2000 );
  camera.position.set(0, 30, 100);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  //renderer.setClearColor(0x000000);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls( camera, renderer.domElement );

  scene = new THREE.Scene();

  time = new THREE.Clock();


  geometry = new THREE.BufferGeometry();

  textureLoader = new THREE.TextureLoader();

  const texture = textureLoader.load("./assets/T_Smoke_SubUV.png");
  const texture2 = textureLoader.load("./assets/T_Smoke_Tiled_D.jpg");

  const meshFloor = new THREE.Mesh(
    new THREE.BoxGeometry(200, 0.1, 200),
    new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0, metalness: 0.5 })
  );
  scene.add(meshFloor);

  const meshCube = new THREE.Mesh(
    new THREE.SphereGeometry(10,10,10),
    new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0, metalness: 0.5 })
  );
  meshCube.position.set(30, 20, 5);
  scene.add(meshCube);


  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 100, 10);
  scene.add(directionalLight);
  const pointLightHelper = new THREE.DirectionalLightHelper(directionalLight, 10);
  scene.add(pointLightHelper);



  uvAnimation = new FlipBook( texture, 8, 8, 64 );

  let vertices = [];

  for (let i = 0; i < 1; i++) {
    const x = 1;
    const y = 1;
    const z = 1;
    vertices.push(x, y, z);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

  material = new THREE.PointsMaterial({
    size: 50,
    map: texture,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    transparent: true,
    alphaMap: texture,
    blendDstAlpha: 100,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(geometry, material);

  particles.translateY(20);

  scene.add(particles);


  window.addEventListener("resize", onWindowResize, false);
};

let update = 0;

const animate = () => {
  requestAnimationFrame(animate);

  const delta = time.getDelta();

  uvAnimation.update(1000 * delta);


  // for (let i = 0; i < 10; i++) {
  //   geometry.attributes.position.setXYZ(i, Math.random() * 100 - 50, i + 10 , Math.random() * 100 - 50)
  // }


  // if(material.opacity < 0.01) {
  //   material.opacity = 1;
  //   update = 0;
  // } else {
  //   material.opacity -= 0.01;
  //   update += 1;
  //   geometry.attributes.position.setY(0, update);
  // }

  //geometry.attributes.position.needsUpdate = true;

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
