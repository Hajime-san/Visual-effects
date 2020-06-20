import * as THREE from '../../../../node_modules/three';
import {OrbitControls} from ',./../../node_modules/three/examples/jsm/controls/OrbitControls';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let planeGeometry: THREE.PlaneGeometry;
let shaderMaterial: THREE.ShaderMaterial;
let partcicles: THREE.Mesh;
let textureLoader: THREE.TextureLoader;
let uniforms: any;
let time: number;
let delta: THREE.Clock;

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

const loadShaders = async () => {
    const vertexShader = await fetch('./assets/shaders/shader.vert').then(res => res.text());
    const fragmentShader = await fetch('./assets/shaders/shader.frag').then(res => res.text());
    return Promise.all([{vertex: vertexShader, fragment: fragmentShader}]);
};

class FlipBook {
    private texture: THREE.Texture;

    private column: number;

    private row: number;

    private playingFrame: number;

    private numberOfFrame: number;

    private currentDelta: number;

    private currentIndex: number;

    constructor(texture: THREE.Texture, column: number, row: number, playingFrame: number, numberOfFrame?: number) {
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

    update(deltaTime: number) {
        this.currentDelta += deltaTime;

        while (this.currentDelta > this.playingFrame) {
            this.currentDelta -= this.playingFrame;
            this.currentIndex += 1;

            if (this.currentIndex === this.numberOfFrame) this.currentIndex = 0;
            const currentColumn = this.currentIndex % this.column;
            this.texture.offset.x = currentColumn / this.column;

            const currentRow = Math.floor((this.currentIndex / this.column) * this.column);
            // const currentRow = Math.floor(this.currentIndex / this.column);

            this.texture.offset.y = currentRow / this.row;
        }
    }
}

const init = async () => {
    const container = document.getElementById('canvas');
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 30, 100);

    renderer = new THREE.WebGLRenderer({antialias: true});
    // renderer.setClearColor(0x000000);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    scene = new THREE.Scene();

    time = 0;

    delta = new THREE.Clock();

    textureLoader = new THREE.TextureLoader();

    const loopAnimationTexture = textureLoader.load('./assets/images/T_Smoke_SubUV.png');
    const baseColorTexture = textureLoader.load('./assets/images/T_Smoke_Tiled_D.jpg');

    const meshFloor = new THREE.Mesh(
        new THREE.BoxGeometry(200, 0.1, 200),
        new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0,
            metalness: 0.5,
        })
    );
    scene.add(meshFloor);

    const meshCube = new THREE.Mesh(
        new THREE.SphereGeometry(10, 10, 10),
        new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0,
            metalness: 0.5,
        })
    );
    meshCube.position.set(30, 20, 5);
    scene.add(meshCube);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 100, 10);
    scene.add(directionalLight);

    planeGeometry = new THREE.PlaneGeometry(40, 40);

    uniforms = {
        loopAnimationTexture: {value: loopAnimationTexture},
        baseColorTexture: {value: baseColorTexture},
        uFixAspect: {
            value: 1 / 1,
        },
        time: {
            value: 0.0,
        },
    };

    const shaders = await loadShaders();

    shaderMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaders[0].vertex,
        fragmentShader: shaders[0].fragment,
        depthTest: true,
        transparent: true,
    });

    partcicles = new THREE.Mesh(planeGeometry, shaderMaterial);

    partcicles.translateY(20);
    partcicles.translateZ(0);

    scene.add(partcicles);

    window.addEventListener('resize', onWindowResize, false);
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    // for (let i = 0; i < 10; i += 1) {
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

    // geometry.attributes.position.needsUpdate = true;

    time += frame;

    uniforms.time.value = time;

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', () => {
    init();
    animate();
});
