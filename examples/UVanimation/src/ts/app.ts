import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, ShaderData, labelMaterial, onWindowResize } from '../../../modules/Util';
import * as ParticleSystem from './ParticleSystem';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let shaderMaterial: THREE.ShaderMaterial;
let textureLoader: THREE.TextureLoader;
let uniforms: { [uniform: string]: THREE.IUniform };
let time: number;
let delta: THREE.Clock;
let shaderData: ShaderData;
let loopAnimationTexture: THREE.Texture;
let baseColorTexture: THREE.Texture;

class GuiUniforms {
    speed: number;

    constructor() {
        this.speed = 1.0;
    }
}

const init = async () => {
    // dat GUI
    const parameters = new GuiUniforms();
    const gui = new dat.GUI();
    gui.add(parameters, 'speed', 0.1, 5.0).onChange(() => {
        uniforms.speed.value = parameters.speed;
    });

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

    loopAnimationTexture = textureLoader.load('./assets/images/T_Smoke_SubUV.png');
    baseColorTexture = textureLoader.load('./assets/images/T_Smoke_Tiled_D.jpg');

    // set uniform variables
    uniforms = {
        loopAnimationTexture: { value: loopAnimationTexture },
        baseColorTexture: { value: baseColorTexture },
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
        { key: 'mixTwoFrame', path: './assets/shaders/mixTwoFrameShader.frag' },
        { key: 'smokeParticleFragment', path: './assets/shaders/smokeParticles.frag' },
    ]);

    shaderMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.mixTwoFrame,
        depthTest: true,
        transparent: true,
    });

    // frame mix animation particle
    const mixTwoFrameGeometry = new THREE.PlaneGeometry(20, 20);

    const mixTwoFrameMesh = new THREE.Mesh(mixTwoFrameGeometry, shaderMaterial);

    mixTwoFrameMesh.position.set(0, 10, 0);

    scene.add(mixTwoFrameMesh);

    const spriteMixedFrameText = new THREE.Sprite(labelMaterial('mixed two frame'));
    spriteMixedFrameText.position.set(0, 25, 0);
    spriteMixedFrameText.scale.set(10, 10, 10);

    scene.add(spriteMixedFrameText);

    // no-mix frame animation
    const singleFrameGeometry = new THREE.PlaneGeometry(20, 20);

    shaderMaterial.fragmentShader = shaderData.singleFrame;

    const singleFrameMesh = new THREE.Mesh(singleFrameGeometry, shaderMaterial);

    singleFrameMesh.position.set(25, 10, 0);

    scene.add(singleFrameMesh);

    const spriteSingleFrameText = new THREE.Sprite(labelMaterial('single frame'));
    spriteSingleFrameText.position.set(25, 25, 0);
    spriteSingleFrameText.scale.set(10, 10, 10);

    scene.add(spriteSingleFrameText);
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    uniforms.time.value = time;

    ParticleSystem.init(scene, shaderData, loopAnimationTexture, baseColorTexture, 10, 20, 0.3, time);

    ParticleSystem.update(time);

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
