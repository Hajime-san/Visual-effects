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
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let copyPass: any;
let taaRenderPass: TAARenderPass;
let renderPass: RenderPass;
let geometry: THREE.BufferGeometry;
let material: THREE.ShaderMaterial;
let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
let uniforms: { [uniform: string]: THREE.IUniform };
let time: number;
let delta: THREE.Clock;
let shaderData: ShaderData;

class GuiUniforms {
    thresHold: number;

    TAASampleLevel: number;

    constructor() {
        this.thresHold = 0.5;

        this.TAASampleLevel = 1;
    }
}

const init = async () => {
    // dat GUI
    const parameters = new GuiUniforms();
    const gui = new dat.GUI();
    gui.add(parameters, 'thresHold', 0.0, 1.0).onChange(() => {
        uniforms.thresHold.value = parameters.thresHold;
    });
    gui.add(parameters, 'TAASampleLevel', {
        'Level 0: 1 Sample': 0,
        'Level 1: 2 Samples': 1,
        'Level 2: 4 Samples': 2,
        'Level 3: 8 Samples': 3,
        'Level 4: 16 Samples': 4,
        'Level 5: 32 Samples': 5,
    }).onFinishChange(() => {
        if (taaRenderPass) {
            taaRenderPass.sampleLevel = parameters.TAASampleLevel;
        }
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

    const noiseTexture = await loadTexture('./assets/images/Good64x64TilingNoiseHighFreq.png');

    const colorTexture = await loadTexture('./assets/images/stripe.jpg');
    // noiseTexture.minFilter = THREE.LinearFilter;
    // noiseTexture.magFilter = THREE.LinearFilter;

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    geometry = new THREE.SphereBufferGeometry(10, 32, 32);

    uniforms = {
        noiseTexture: {
            value: noiseTexture,
        },
        colorTexture: {
            value: colorTexture,
        },
        thresHold: {
            value: parameters.thresHold,
        },
        TAASampleLevel: {
            value: parameters.TAASampleLevel,
        },
        time: {
            value: 0.0,
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
        // blendEquation: THREE.MinEquation,
        blendDst: THREE.DstColorFactor,
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
        new THREE.MeshBasicMaterial({
            color: 0xff0000,
            blending: THREE.AdditiveBlending,
        })
    );

    boxMesh.position.set(0, 10, -40);
    scene.add(boxMesh);

    // postprocessing

    composer = new EffectComposer(renderer);

    taaRenderPass = new TAARenderPass(scene, camera);
    taaRenderPass.unbiased = false;
    taaRenderPass.sampleLevel = parameters.TAASampleLevel;
    composer.addPass(taaRenderPass);

    renderPass = new RenderPass(scene, camera);
    renderPass.enabled = false;
    composer.addPass(renderPass);

    copyPass = new ShaderPass(material);
    copyPass.renderToScreen = true;
    composer.addPass(copyPass);

    window.addEventListener(
        'resize',
        () => {
            onWindowResize(camera, renderer);
            composer.setSize(window.innerWidth, window.innerHeight);
        },
        false
    );
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    mesh.material.uniforms.time.value = time;

    taaRenderPass.enabled = true;

    // taaRenderPass.accumulate = true;

    composer.render();

    // renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
