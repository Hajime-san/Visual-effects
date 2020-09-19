import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, onWindowResize, loadTexture } from '../../../modules/Util';

let baseCamera: THREE.PerspectiveCamera;
let postCamera: THREE.PerspectiveCamera;
let baseScene: THREE.Scene;
let postScene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let sphereGeometry: THREE.BufferGeometry;
let sphereMaterial: THREE.ShaderMaterial;
let sphereMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
let uniforms: { [uniform: string]: THREE.IUniform };

class GuiUniforms {
    thresHold: number;

    constructor() {
        this.thresHold = 0.5;
    }
}

const init = async () => {
    // dat GUI
    const parameters = new GuiUniforms();
    const gui = new dat.GUI();
    gui.add(parameters, 'thresHold', 0.0, 1.0).onChange(() => {
        uniforms.thresHold.value = parameters.thresHold;
    });

    // intial settings
    const container = document.getElementById('canvas');

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // main scene

    baseScene = new THREE.Scene();

    baseCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 2000);
    baseCamera.position.set(0, 30, 70);

    const controls = new OrbitControls(baseCamera, renderer.domElement);

    // floor
    const meshFloor = new THREE.Mesh(
        new THREE.BoxGeometry(200, 0.1, 200),
        new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0,
            metalness: 0.5,
        })
    );
    baseScene.add(meshFloor);

    // lights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 1, 10);
    baseScene.add(directionalLight);

    const light = new THREE.AmbientLight(0xffffff, 1.0);
    baseScene.add(light);

    sphereGeometry = new THREE.SphereBufferGeometry(10, 32, 32);

    uniforms = {
        ditherMap: {
            value: await loadTexture('./assets/images/Good64x64TilingNoiseHighFreq.png'),
        },
        thresHold: {
            value: parameters.thresHold,
        },
        TAASampleLevel: {
            value: 0,
        },
        tDiffuse: {
            value: null,
        },

        // lights
        ...THREE.UniformsLib.lights,
    };

    // set shader
    const shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    sphereMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        blending: THREE.AdditiveBlending,
        lights: true,
        extensions: {
            derivatives: true,
        },
    });

    sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

    sphereMesh.position.set(0, 10, 0);
    baseScene.add(sphereMesh);

    const box = new THREE.BoxGeometry(10, 10, 10);

    const boxMesh = new THREE.Mesh(
        box,
        new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.5,
            roughness: 0.3,
            // opacity: 0.3,
            // transparent: true,
        })
    );

    boxMesh.position.set(0, 10, -40);
    boxMesh.rotation.set(10, 0, 10);
    baseScene.add(boxMesh);

    // postprocessing scene

    composer = new EffectComposer(renderer);
    composer.setSize(512, 512);

    postScene = new THREE.Scene();

    postCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 2000);
    postCamera.position.set(0, 30, 70);

    const taaRenderPass = new TAARenderPass(postScene, postCamera);
    taaRenderPass.unbiased = false;
    taaRenderPass.enabled = true;
    taaRenderPass.sampleLevel = 0;
    composer.addPass(taaRenderPass);

    // combine scenes

    const mainScenePass = new RenderPass(baseScene, baseCamera);
    composer.addPass(mainScenePass);

    window.addEventListener('resize', () => onWindowResize(baseCamera, renderer), false);
};

const animate = () => {
    requestAnimationFrame(animate);

    composer.render();
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
