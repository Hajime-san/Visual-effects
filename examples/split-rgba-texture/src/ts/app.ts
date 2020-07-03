import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { loadShaders, ShaderData, onWindowResize, rangedRandom } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let mesh: Array<THREE.Mesh> = [];
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

    mesh = [];

    for (let index = 0; index < 15; index += 1) {
        const geometry = new THREE.PlaneGeometry(5, 5);

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
                // value: new THREE.Vector4(3, 3, 4, -1),
                value: new THREE.Vector4(rangedRandom(3, -1), rangedRandom(3, -1), rangedRandom(4, -1.5), rangedRandom(0, -1)),
            },
            dynamicParameter: {
                // value: new THREE.Vector3(1, 4, 1),
                value: new THREE.Vector3(1, 1, 1),
            },
            scale: {
                value: new THREE.Vector3(1, 1, 1),
            },
        };

        const shaderMaterial = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: shaderData.vertex,
            fragmentShader: shaderData.fragment,
            depthTest: true,
            transparent: true,
        });

        mesh[index] = new THREE.Mesh(geometry, shaderMaterial);

        mesh[index].position.set(rangedRandom(10, -10), rangedRandom(5, 8), 20);

        scene.add(mesh[index]);
    }
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    for (let index = 0; index < 15; index += 1) {
        const material = mesh[index].material as THREE.ShaderMaterial;
        material.uniforms.time.value = time;
    }

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
