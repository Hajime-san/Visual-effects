import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, ShaderData, onWindowResize, loadTexture, loadGLTF } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
let uniforms: { [uniform: string]: THREE.IUniform };
let time: number;
let delta: THREE.Clock;
let shaderData: ShaderData;
let directionalLight: THREE.DirectionalLight;
let lightHelper: THREE.DirectionalLightHelper;

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
    const meshFloor = new THREE.Mesh(
        new THREE.BoxGeometry(200, 0.1, 200),
        new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0,
            metalness: 0.5,
        })
    );
    scene.add(meshFloor);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    // directionalLight.position.set(0, 300, -500);
    scene.add(directionalLight);

    lightHelper = new THREE.DirectionalLightHelper(directionalLight);
    scene.add(lightHelper);

    const light = new THREE.AmbientLight(0xffffff, 1);
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

        // lights
        ...THREE.UniformsLib.lights,
    };

    const model = await loadGLTF('./assets/model/multi_uv.glb');

    mesh = model.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

    mesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        depthTest: true,
        transparent: true,
        lights: true,
        side: THREE.DoubleSide,
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

    // 照明の位置を更新
    const t = Date.now() / 1000;
    const r = 30.0;
    const lx = r * Math.cos(t);
    const lz = r * Math.sin(t);
    directionalLight.position.set(lx, 20, lz);
    lightHelper.update();

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
