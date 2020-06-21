import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

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

const init = async () => {
    // intial settings
    const container = document.getElementById('canvas');
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 20, 50);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    scene = new THREE.Scene();

    time = 0;

    delta = new THREE.Clock();

    window.addEventListener('resize', onWindowResize, false);

    // floor
    const meshFloor = new THREE.Mesh(
        new THREE.BoxGeometry(200, 0.1, 200),
        new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0,
            metalness: 0.5,
        })
    );
    scene.add(meshFloor);

    // cube
    const meshCube = new THREE.Mesh(
        new THREE.SphereGeometry(10, 10, 10),
        new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0,
            metalness: 0.5,
        })
    );
    meshCube.position.set(-30, 10, 0);
    scene.add(meshCube);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 100, 10);
    scene.add(directionalLight);

    // load textures
    textureLoader = new THREE.TextureLoader();

    const loopAnimationTexture = textureLoader.load('./assets/images/T_Smoke_SubUV.png');
    const baseColorTexture = textureLoader.load('./assets/images/T_Smoke_Tiled_D.jpg');

    // set uniform variables
    uniforms = {
        loopAnimationTexture: {value: loopAnimationTexture},
        baseColorTexture: {value: baseColorTexture},
        uFixAspect: {
            value: 1 / 1,
        },
        time: {
            value: 0.0,
        },
        speed: {
            value: 1.0,
        },
        mixNextFrame: {
            value: 1,
        },
        COLUMN: {
            value: 8,
        },
        ROW: {
            value: 8,
        },
        scale: {
            type: 'v3',
            value: new THREE.Vector3(1, 1, 1),
        },
    };

    // set shader
    const shaders = await loadShaders();

    shaderMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaders[0].vertex,
        fragmentShader: shaders[0].fragment,
        depthTest: true,
        transparent: true,
    });

    // frame mix animation particle
    planeGeometry = new THREE.PlaneGeometry(20, 20);

    partcicles = new THREE.Mesh(planeGeometry, shaderMaterial);

    partcicles.position.set(0, 10, 0);

    scene.add(partcicles);

    // no-mix
    const nonMixFrameGeometry = new THREE.PlaneGeometry(20, 20);

    uniforms.mixNextFrame.value = 0;

    const noMixFrameParticles = new THREE.Mesh(nonMixFrameGeometry, shaderMaterial);

    noMixFrameParticles.position.set(25, 10, 0);

    scene.add(noMixFrameParticles);
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    uniforms.time.value = time;

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
