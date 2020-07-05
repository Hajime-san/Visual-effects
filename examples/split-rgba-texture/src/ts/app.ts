import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, ShaderData, onWindowResize } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let material: THREE.ShaderMaterial;
let mesh: THREE.Mesh;
let textureLoader: THREE.TextureLoader;
let uniforms: { [uniform: string]: THREE.IUniform };
let time: number;
let delta: THREE.Clock;
let shaderData: ShaderData;
let loopAnimationTexture: THREE.Texture;

class GuiUniforms {
    speed: number;

    rChannel: number;

    gChannel: number;

    bChannel: number;

    intensity: number;

    baseColor: Array<number>;

    constructor() {
        this.speed = 1.0;
        this.rChannel = 3.0;
        this.gChannel = 3.0;
        this.bChannel = 4.0;
        this.intensity = 1.0;
        this.baseColor = [248.37, 0, 1.2291];
    }
}

const init = async () => {
    // dat GUI
    const parameters = new GuiUniforms();
    const gui = new dat.GUI();
    gui.add(parameters, 'speed', 0.1, 5.0).onChange(() => {
        uniforms.speed.value = parameters.speed;
    });
    gui.add(parameters, 'rChannel', 0, 10.0).onChange(() => {
        uniforms.particleColor.value.x = parameters.rChannel;
    });
    gui.add(parameters, 'gChannel', 0, 10.0).onChange(() => {
        uniforms.particleColor.value.y = parameters.gChannel;
    });
    gui.add(parameters, 'bChannel', 0, 10.0).onChange(() => {
        uniforms.particleColor.value.z = parameters.bChannel;
    });
    gui.add(parameters, 'intensity', 0, 3).onChange(() => {
        uniforms.dynamicParameter.value.y = parameters.intensity;
    });
    gui.addColor(parameters, 'baseColor').onChange(() => {
        uniforms.baseColor.value = parameters.baseColor;
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
    directionalLight.position.set(1, 1, -10);
    scene.add(directionalLight);

    // load textures
    textureLoader = new THREE.TextureLoader();

    loopAnimationTexture = textureLoader.load('./assets/images/fire-simple-blend.png');

    // set uniform variable

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    // frame mix animation particle

    const geometry = new THREE.PlaneGeometry(20, 20);

    uniforms = {
        loopAnimationTexture: { value: loopAnimationTexture },
        time: {
            value: 0.0,
        },
        speed: {
            value: 0.8,
        },
        COLUMN: {
            value: 8,
        },
        ROW: {
            value: 8,
        },
        particleColor: {
            // particleColor.value.x is channel of the R in texture
            // particleColor.value.y is channel of the G in texture
            // particleColor.value.z is channel of the B in texture
            value: new THREE.Vector4(3, 3, 4, -1),
        },
        dynamicParameter: {
            value: new THREE.Vector3(1, 1, 1),
        },
        baseColor: {
            value: [248.37, 77.01, 1.2291],
        },
        scale: {
            value: new THREE.Vector3(1, 1, 1),
        },
    };

    material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        depthTest: true,
        transparent: true,
    });

    mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(0, 10, 0);

    scene.add(mesh);
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    material.uniforms.time.value = time;

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
