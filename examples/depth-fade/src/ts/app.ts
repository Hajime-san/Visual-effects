import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, onWindowResize } from '../../../modules/Util';

let baseCamera: THREE.PerspectiveCamera;
let postCamera: THREE.OrthographicCamera;
let baseScene: THREE.Scene;
let postScene: THREE.Scene;
let target: THREE.WebGLRenderTarget;
let renderer: THREE.WebGLRenderer;
let sphereMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
let controls: OrbitControls;
let depthFlag = false;

class GuiUniforms {
    thresHold: number;

    depth: boolean;

    constructor() {
        this.thresHold = 0.3;
        this.depth = depthFlag;
    }
}

const init = async () => {
    // dat GUI
    const parameters = new GuiUniforms();
    const gui = new dat.GUI();
    gui.add(parameters, 'thresHold', 0.0, 1.0).onChange(() => {
        sphereMesh.material.uniforms.thresHold.value = parameters.thresHold;
    });
    gui.add(parameters, 'depth').onChange(() => {
        depthFlag = parameters.depth;
    });

    // intial settings
    const container = document.getElementById('canvas');

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // main scene
    baseScene = new THREE.Scene();

    baseCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 500);
    baseCamera.position.set(0, 10, 50);

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

    // set shader
    const shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
        { key: 'postVertex', path: './assets/shaders/post.vert' },
        { key: 'postFragment', path: './assets/shaders/post.frag' },
    ]);

    // depth fade mesh
    const sphereGeometry = new THREE.SphereBufferGeometry(10, 32, 32);

    const near = baseCamera.near;
    const far = 300;

    const sphereUniforms = {
        depthMap: {
            value: null,
        },
        thresHold: {
            value: parameters.thresHold,
        },
        ZBufferParams: {
            value: new THREE.Vector4((1 - far) / near, far / near, (1 - far) / near / far, far / near / far),
        },
        // lights
        ...THREE.UniformsLib.lights,
    };

    // depth fade mesh
    const sphereMaterial = new THREE.ShaderMaterial({
        uniforms: sphereUniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        transparent: true,
        lights: true,
        extensions: {
            derivatives: true,
        },
    });

    sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

    sphereMesh.position.set(0, 10, 0);
    baseScene.add(sphereMesh);

    // box mesh
    const boxMesh = new THREE.Mesh(
        new THREE.BoxGeometry(10, 10, 10),
        new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.5,
            roughness: 0.3,
        })
    );

    boxMesh.position.set(10, 10, 0);
    boxMesh.rotation.set(10, 0, 10);
    baseScene.add(boxMesh);

    // render depth buffer
    target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
    target.texture.format = THREE.RGBFormat;
    target.texture.minFilter = THREE.NearestFilter;
    target.texture.magFilter = THREE.NearestFilter;
    target.texture.generateMipmaps = false;
    target.stencilBuffer = true;
    target.depthBuffer = true;
    target.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
    target.depthTexture.format = THREE.DepthFormat;
    target.depthTexture.type = THREE.UnsignedShortType;

    postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMaterial = new THREE.ShaderMaterial({
        vertexShader: shaderData.postVertex,
        fragmentShader: shaderData.postFragment,
        uniforms: {
            cameraNear: {
                value: near,
            },
            cameraFar: {
                value: far,
            },
            depthMap: {
                value: target.depthTexture,
            },
        },
    });
    const postPlane = new THREE.PlaneBufferGeometry(2, 2);
    const postQuad = new THREE.Mesh(postPlane, postMaterial);
    postScene = new THREE.Scene();
    postScene.add(postQuad);

    window.addEventListener('resize', () => onWindowResize(baseCamera, renderer), false);
};

const animate = () => {
    requestAnimationFrame(animate);

    if (depthFlag) {
        controls.enabled = false;
        renderer.render(postScene, postCamera);
    } else {
        controls.enabled = true;
        // render depth scene into target
        renderer.setRenderTarget(target);
        renderer.render(baseScene, baseCamera);

        renderer.setRenderTarget(null);
        renderer.render(baseScene, baseCamera);

        sphereMesh.material.uniforms.depthMap.value = target.depthTexture;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
