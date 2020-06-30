import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { loadShaders, ShaderData, onWindowResize } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let planeGeometry: THREE.PlaneGeometry;
let shaderMaterial: THREE.ShaderMaterial;
let textureLoader: THREE.TextureLoader;
let uniforms: { [uniform: string]: THREE.IUniform };
let time: number;
let delta: THREE.Clock;
let shaderData: ShaderData;
let loopAnimationTexture: THREE.Texture;

const init = async () => {
    // intial settings
    const container = document.getElementById('canvas');
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 10, 40);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    scene = new THREE.Scene();

    time = 0;

    delta = new THREE.Clock();

    window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

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

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 100, 10);
    scene.add(directionalLight);

    // load textures
    textureLoader = new THREE.TextureLoader();

    loopAnimationTexture = textureLoader.load('./assets/images/fire-simple-blend.png');

    // set uniform variables
    uniforms = {
        loopAnimationTexture: { value: loopAnimationTexture },
        time: {
            value: 0.0,
        },
        speed: {
            value: 0.5,
        },
        COLUMN: {
            value: 8,
        },
        ROW: {
            value: 8,
        },
        scale: {
            value: new THREE.Vector3(1, 1, 1),
        },
    };

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'singleFrame', path: './assets/shaders/singleFrame.frag' },
    ]);

    shaderMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.singleFrame,
        depthTest: true,
        transparent: true,
    });

    // frame mix animation particle
    const mixTwoFrameGeometry = new THREE.PlaneGeometry(20, 20);

    const mixTwoFrameMesh = new THREE.Mesh(mixTwoFrameGeometry, shaderMaterial);

    mixTwoFrameMesh.position.set(0, 10, 0);

    scene.add(mixTwoFrameMesh);
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
