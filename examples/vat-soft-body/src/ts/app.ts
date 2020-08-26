import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, ShaderData, onWindowResize, loadGLTF, loadVATexrTexture, loadTexture } from '../../../modules/Util';

import data from '../../dist/assets/model/RubberToy.json';

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

    constructor(totalFrame: number) {
        this.totalFrame = totalFrame;
    }
}

const init = async () => {
    // dat GUI
    const parameters = new GuiUniforms(VATdata.numOfFrames);
    const gui = new dat.GUI();
    gui.add(parameters, 'totalFrame', VATdata.numOfFrames * 0.5, VATdata.numOfFrames * 2).onChange(() => {
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

    const positionMap = await loadVATexrTexture('./assets/images/RubberToy.exr');

    // 8-bit png converted from exr
    const normalMap = await loadTexture('./assets/images/RubberToy_normal.png');
    normalMap.encoding = THREE.LinearEncoding;
    normalMap.minFilter = THREE.LinearFilter;
    normalMap.magFilter = THREE.NearestFilter;

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    const model = await loadGLTF('./assets/model/RubberToy.glb');

    mesh = model.scenes[0].children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

    let colorMap: THREE.Texture;

    model.parser.associations.forEach((value, key: THREE.Texture) => {
        if (value.type === 'textures' && value.index === 0) {
            colorMap = key;
        }
    });

    uniforms = {
        positionMap: {
            value: positionMap,
        },
        normalMap: {
            value: normalMap,
        },
        colorMap: {
            value: colorMap,
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
        // total animation frame
        totalFrame: {
            value: VATdata.numOfFrames,
        },
        currentFrame: {
            value: 0,
        },

        // lights
        ...THREE.UniformsLib.lights,
    };

    mesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        lights: true,
        extensions: {
            derivatives: true,
        },
    });

    mesh.position.set(0, 10, 0);
    mesh.scale.set(10, 10, 10);
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
