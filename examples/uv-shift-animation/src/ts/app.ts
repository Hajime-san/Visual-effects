import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { ReflectiveMesh } from '../../../modules/ReflectionMaterial/ReflectiveMesh';
import { loadShaders, ShaderData, onWindowResize, loadTexture, loadGLTF } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
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
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        clipBias: 0.05,
        roughness: 0.1,
        metalness: 0.5,
        color: new THREE.Color(0x777777),
        mapPath: './assets/images/Metal002_2K_Color.jpg',
        normalMapPath: './assets/images/Metal002_2K_Normal.jpg',
        roughnessMapPath: './assets/images/Metal002_2K_Roughness.jpg',
    });

    meshFloor.rotateX(-Math.PI / 2);
    meshFloor.receiveShadow = true;
    scene.add(meshFloor);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 100, -10);
    scene.add(directionalLight);

    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    // load textures
    const texture = await loadTexture('./assets/images/smoke.png');

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    const SCALE = new THREE.Vector3().setScalar(10);

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
        scale: {
            value: new THREE.Vector3(SCALE.x, SCALE.y, SCALE.z),
        },
    };

    const model = await loadGLTF('./assets/model/multi_uv.glb');

    mesh = model.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

    mesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        transparent: true,
    });

    model.scene.position.set(20, 45, -20);
    model.scene.scale.setScalar(SCALE.x);
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
