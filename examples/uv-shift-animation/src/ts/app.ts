import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { ReflectiveMesh } from '../../../modules/ReflectionMaterial/reflector';
import { loadShaders, ShaderData, onWindowResize, loadTexture, loadGLTF } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
let meshFloor: THREE.Mesh;
let uniforms: { [uniform: string]: THREE.IUniform };
let time: number;
let delta: THREE.Clock;
let shaderData: ShaderData;

class GuiUniforms {
    speed: number;

    constructor() {
        this.speed = 0.5;
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
    const mirrorGeometry = new THREE.PlaneGeometry(200, 200);
    meshFloor = await ReflectiveMesh.new(mirrorGeometry, {
        clipBias: 0.05,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: new THREE.Color(0x777777),
        colorTexturePath: './assets/images/T_Metal_Rust_D.png',
        normalTexturePath: './assets/images/T_Metal_Rust_N.png',
    });

    meshFloor.rotateX(-Math.PI / 2);
    meshFloor.receiveShadow = true;
    scene.add(meshFloor);

    const sphere = new THREE.SphereGeometry(5);
    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0,
        metalness: 0.5,
    });
    const sphereMesh = new THREE.Mesh(sphere, sphereMaterial);
    sphereMesh.position.set(10, 10, 0);
    scene.add(sphereMesh);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, -10);
    scene.add(directionalLight);

    const light = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(light);

    // load textures
    const texture = await loadTexture('./assets/images/smoke.png');

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    // set uniform variable
    uniforms = {
        texture: {
            value: texture,
        },
        time: {
            value: 0.0,
        },
        speed: {
            value: 0.5,
        },
    };

    const model = await loadGLTF('./assets/model/multi_uv.glb');

    mesh = model.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;

    mesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        depthTest: true,
        transparent: true,
    });

    model.scene.position.set(30, 25, -20);
    model.scene.rotation.set(0, 0, 70);
    model.scene.scale.set(10, 10, 10);
    scene.add(model.scene);
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    mesh.material.uniforms.time.value = time;

    // meshFloor.material.envMap = cubeRenderTarget.texture;

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
