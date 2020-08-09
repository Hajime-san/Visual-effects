import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, ShaderData, onWindowResize, loadTexture, loadGLTF } from '../../../modules/Util';

import data from '../../dist/assets/model/box.json';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
let uniforms: { [uniform: string]: THREE.IUniform };
let time: number;
let delta: THREE.Clock;
let currentFrame = 0;
let shaderData: ShaderData;
const VATdata = data[0];

class GuiUniforms {
    totalFrame: number;

    constructor() {
        this.totalFrame = 60;
    }
}

const loadEXRtexture = async (url: string) => {
    const loader = new EXRLoader();
    return new Promise((resolve, reject) => {
        loader.setDataType(THREE.HalfFloatType).load(url, texture => {
            resolve(texture);
        });
    });
};

const init = async () => {
    // dat GUI
    const parameters = new GuiUniforms();
    const gui = new dat.GUI();
    gui.add(parameters, 'totalFrame', 10, 120).onChange(() => {
        uniforms.totalFrame.value = parameters.totalFrame;
        currentFrame = 0;
    });

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

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, -10);
    scene.add(directionalLight);

    const light = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(light);

    const positionMap = await loadTexture('./assets/images/box.bmp');

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    const model = await loadGLTF('./assets/model/box.glb');

    mesh = model.scenes[0].children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

    // set id for each vertices
    const indicesLength = mesh.geometry.attributes.position.count - 1;

    uniforms = {
        positionMap: {
            value: positionMap,
        },
        time: {
            value: 0.0,
        },
        // set bounding box for correct scale
        boudingBoxMax: {
            value: VATdata.posMax,
        },
        // set bounding box for correct scale
        boundingBoxMin: {
            value: VATdata.posMin,
        },
        indicesLength: {
            value: indicesLength,
        },
        // total animation frame
        totalFrame: {
            value: VATdata.numOfFrames,
        },
        currentFrame: {
            value: 0,
        },
    };

    mesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        depthTest: true,
        transparent: true,
    });

    mesh.position.set(0, 10, 0);
    mesh.scale.set(0.1, 0.1, 0.1);
    scene.add(mesh);
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    mesh.material.uniforms.time.value = time;

    currentFrame += 1;

    mesh.material.uniforms.currentFrame.value = currentFrame;

    if (currentFrame === Math.floor(mesh.material.uniforms.totalFrame.value)) {
        currentFrame = 0;
    }

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
