import * as THREE from "../../../../node_modules/three";
import { OrbitControls } from ',./../../node_modules/three/examples/jsm/controls/OrbitControls'

let camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  geometry: THREE.BufferGeometry,
  material: THREE.PointsMaterial,
  material2: THREE.PointsMaterial,
  mat: THREE.ShaderMaterial,
  textureLoader: THREE.TextureLoader,
  uniforms: any,
  // mesh: THREE.Mesh,
  uvAnimation: FlipBook,
  uvAnimation2: FlipBook,
  time: number,
  delta: THREE.Clock;

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

  time = 0;

  delta = new THREE.Clock();


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
  // const pointLightHelper = new THREE.DirectionalLightHelper(directionalLight, 10);
  // scene.add(pointLightHelper);



  uvAnimation = new FlipBook( texture, 8, 8, 64 );

  uvAnimation2 = new FlipBook( texture2, 8, 8, 64 );

  let vertices = [];

  for (let i = 0; i < 1; i++) {
    const x = 1;
    const y = 1;
    const z = 1;
    vertices.push(x, y, z);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

  const geo = new THREE.PlaneGeometry(40, 40);

  material = new THREE.PointsMaterial({
    size: 50,
    map: texture,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    transparent: true,
    sizeAttenuation: true
  });

  material2 = new THREE.PointsMaterial({
    size: 50,
    map: texture2,
    blending: THREE.MultiplyBlending,
    depthTest: true,
    transparent: true,
    sizeAttenuation: true,
  });

  uniforms = {
    uTex: { value: texture },
    uTex2: { value: texture2 },
    uFixAspect: {
      value: 1 / 1
    },
    time: {
      value: 0.0
    }
  };

   mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexSource(),
    fragmentShader: fragmentSource(),
    depthTest: true,
    transparent: true
  });

  const particles = new THREE.Points(geometry, material);

  particles.translateX(-50);
  particles.translateY(20);

  scene.add(particles);


  const mesh = new THREE.Mesh(geo, mat);

  mesh.translateY(20);
  mesh.translateZ(0);

  scene.add(mesh);

  window.addEventListener("resize", onWindowResize, false);
};

let update = 0;

const animate = () => {
  requestAnimationFrame(animate);

  let frame = delta.getDelta();

  uvAnimation.update(1000 * frame);

  uvAnimation2.update(1000 * frame);

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

  time += frame;

  mat.uniformsNeedUpdate = true;

  uniforms.time.value = time;

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


function vertexSource() {
  return `
    varying vec2 vUv;

    uniform float uFixAspect;
    uniform sampler2D uTex;
    uniform sampler2D uTex2;

    void main() {
      vUv = uv - .5;
      vUv.y *= uFixAspect;
      vUv += .5;

      gl_Position = projectionMatrix * modelViewMatrix * vec4( position , 1.0);
    }
  `
}


function fragmentSource() {
  return `
    #define COLUMN 8.0
    #define ROW 8.0

    varying vec2 vUv;

    uniform sampler2D uTex;
    uniform sampler2D uTex2;
    uniform float time;

    void main() {

      float frame = 16.0;

      float offsetX = (vUv.x + floor(time * frame)) / COLUMN;
      float offsetY = (vUv.y + floor(time * frame)) / COLUMN;

      vec4 color = texture2D( uTex, vec2(offsetX, offsetY) ).rgba;
      vec3 color2 = texture2D( uTex2, vec2(offsetX, offsetY) ).rgb;
      vec4 finalColor = vec4(color.rgb + color2, color.a);

      gl_FragColor = finalColor;
    }

  `
}
