import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, onWindowResize, loadTexture } from '../../../modules/Util';

let baseCamera: THREE.PerspectiveCamera;
let postCamera: THREE.OrthographicCamera;
let baseScene: THREE.Scene;
let postScene: THREE.Scene;
let target: THREE.WebGLRenderTarget;
let renderer: THREE.WebGLRenderer;
let sphereGeometry: THREE.BufferGeometry;
let sphereMaterial: THREE.ShaderMaterial;
let postMaterial: THREE.ShaderMaterial;
let sphereMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
let uniforms: { [uniform: string]: THREE.IUniform };
let controls: OrbitControls;

class GuiUniforms {
    thresHold: number;

    constructor() {
        this.thresHold = 0.5;
    }
}

const params = {
    format: THREE.DepthFormat,
    type: THREE.UnsignedShortType,
};

const formats = { DepthFormat: THREE.DepthFormat, DepthStencilFormat: THREE.DepthStencilFormat };
const types = { UnsignedShortType: THREE.UnsignedShortType, UnsignedIntType: THREE.UnsignedIntType, UnsignedInt248Type: THREE.UnsignedInt248Type };

function setupRenderTarget() {
    if (target) target.dispose();

    const format = parseFloat(params.format as any);
    const type = parseFloat(params.type as any);

    target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
    target.texture.format = THREE.RGBFormat;
    target.texture.minFilter = THREE.NearestFilter;
    target.texture.magFilter = THREE.NearestFilter;
    target.texture.generateMipmaps = false;
    target.stencilBuffer = format === THREE.DepthStencilFormat;
    target.depthBuffer = true;
    target.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
    target.depthTexture.format = format;
    target.depthTexture.type = type;
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

    controls = new OrbitControls(baseCamera, renderer.domElement);

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
        { key: 'postVertex', path: './assets/shaders/post.vert' },
        { key: 'postFragment', path: './assets/shaders/post.frag' },
    ]);

    sphereMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        transparent: true,
        depthTest: true,
        depthWrite: true,
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

    boxMesh.position.set(10, 10, 0);
    boxMesh.rotation.set(10, 0, 10);
    baseScene.add(boxMesh);

    function setupPost() {
        // Setup post processing stage
        postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        postMaterial = new THREE.ShaderMaterial({
            vertexShader: shaderData.postVertex,
            fragmentShader: shaderData.postFragment,
            uniforms: {
                cameraNear: {
                    value: baseCamera.near,
                },
                cameraFar: {
                    value: baseCamera.far,
                },
                tDiffuse: {
                    value: null,
                },
                tDepth: {
                    value: null,
                },
            },
        });
        const postPlane = new THREE.PlaneBufferGeometry(2, 2);
        const postQuad = new THREE.Mesh(postPlane, postMaterial);
        postScene = new THREE.Scene();
        postScene.add(postQuad);
    }

    setupPost();

    setupRenderTarget();

    window.addEventListener('resize', () => onWindowResize(baseCamera, renderer), false);
};

const animate = () => {
    requestAnimationFrame(animate);

    // render scene into target
    renderer.setRenderTarget(target);
    renderer.render(baseScene, baseCamera);

    // render post FX
    postMaterial.uniforms.tDiffuse.value = target.texture;
    postMaterial.uniforms.tDepth.value = target.depthTexture;

    // const p = target.clone();

    // sphereMaterial.uniforms.tDiffuse.value = p.texture;

    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);

    controls.update();
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
