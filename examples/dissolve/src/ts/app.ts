import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, ShaderData, onWindowResize, loadTexture, loadGLTF } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let geometry: THREE.BufferGeometry;
let material: THREE.ShaderMaterial;
let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
let gltfMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
let uniforms: { [uniform: string]: THREE.IUniform };
let gltfUniforms: { [uniform: string]: any };
let time: number;
let delta: THREE.Clock;
let shaderData: ShaderData;

class GuiUniforms {
    thresHold: number;

    edgeWidth: number;

    constructor() {
        this.thresHold = 0.5;
        this.edgeWidth = 0.3;
    }
}

const init = async () => {
    // dat GUI
    // const parameters = new GuiUniforms();
    // const gui = new dat.GUI();
    // gui.add(parameters, 'thresHold', 0.0, 1.0).onChange(() => {
    //     uniforms.thresHold.value = parameters.thresHold;
    // });
    // gui.add(parameters, 'edgeWidth', 0.0, 1.0).onChange(() => {
    //     uniforms.edgeWidth.value = parameters.edgeWidth;
    // });

    // intial settings
    const container = document.getElementById('canvas');
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 30, 70);

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

    // lights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 1, 10);
    scene.add(directionalLight);

    const light = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(light);

    const noiseTexture = await loadTexture('./assets/images/T_Perlin_Noise_M.png');
    noiseTexture.minFilter = THREE.LinearFilter;
    noiseTexture.magFilter = THREE.LinearFilter;

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
        { key: 'gltfVert', path: './assets/shaders/gltfShader.vert' },
        { key: 'gltfFrag', path: './assets/shaders/gltfShader.frag' },
    ]);

    // billboard square mesh
    geometry = new THREE.PlaneBufferGeometry(50, 50);

    uniforms = {
        noiseTexture: {
            value: noiseTexture,
        },
        time: {
            value: 0.0,
        },
        // thresHold: {
        //     value: parameters.thresHold,
        // },
        // edgeWidth: {
        //     value: parameters.edgeWidth,
        // },
        scale: {
            value: new THREE.Vector3(1, 1, 1),
        },
    };

    material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        depthTest: true,
        transparent: true,
    });

    mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(-30, 30, 0);
    scene.add(mesh);

    // gltf mesh
    const model = await loadGLTF('./assets/model/suzanne.glb');

    gltfMesh = model.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

    gltfUniforms = {
        noiseTexture: {
            value: noiseTexture,
        },
        time: {
            value: 0.0,
        },

        ...THREE.UniformsLib.lights,
    };

    gltfMesh.material = new THREE.ShaderMaterial({
        uniforms: gltfUniforms,
        lights: true,
        vertexShader: shaderData.gltfVert,
        fragmentShader: shaderData.gltfFrag,
        depthTest: true,
        transparent: true,
    });
    gltfMesh.scale.set(10, 10, 10);
    gltfMesh.position.set(30, 10, 0);
    scene.add(gltfMesh);
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    mesh.material.uniforms.time.value = time;

    gltfMesh.material.uniforms.time.value = time;

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
