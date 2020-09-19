import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, ShaderData, onWindowResize, loadTexture, loadGLTF } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let postCamera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let postScene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let copyPass: any;
let taaRenderPass: TAARenderPass;
let renderPass: RenderPass;
let geometry: THREE.BufferGeometry;
let material: THREE.ShaderMaterial;
let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
let uniforms: { [uniform: string]: THREE.IUniform };
let shaderData: ShaderData;

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
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 30, 70);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    scene = new THREE.Scene();

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

    const ditherMap = await loadTexture('./assets/images/Good64x64TilingNoiseHighFreq.png');

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    geometry = new THREE.SphereBufferGeometry(10, 32, 32);

    uniforms = {
        ditherMap: {
            value: ditherMap,
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

    material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        blending: THREE.CustomBlending,
        blendDst: THREE.ZeroFactor,
        lights: true,
        extensions: {
            derivatives: true,
        },
    });

    mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(0, 10, 0);
    scene.add(mesh);

    const box = new THREE.BoxGeometry(10, 10, 10);

    const boxMesh = new THREE.Mesh(
        box,
        new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.5,
            roughness: 0.3,
            opacity: 0.3,
            transparent: true,
        })
    );

    boxMesh.position.set(0, 10, -40);
    boxMesh.rotation.set(10, 0, 10);
    scene.add(boxMesh);

    // postprocessing

    composer = new EffectComposer(renderer);
    composer.setSize(512, 512);

    postScene = new THREE.Scene();

    postCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 30, 70);

    taaRenderPass = new TAARenderPass(postScene, postCamera);
    taaRenderPass.unbiased = false;
    taaRenderPass.enabled = true;
    taaRenderPass.sampleLevel = 0;
    composer.addPass(taaRenderPass);

    renderPass = new RenderPass(postScene, postCamera);
    renderPass.enabled = false;
    composer.addPass(renderPass);

    copyPass = new ShaderPass(material);
    copyPass.renderToScreen = true;
    composer.addPass(copyPass);

    window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
};

const animate = () => {
    requestAnimationFrame(animate);

    composer.render();

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
