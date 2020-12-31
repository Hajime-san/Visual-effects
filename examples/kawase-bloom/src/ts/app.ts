import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, onWindowResize } from '../../../modules/Util';

let baseCamera: THREE.PerspectiveCamera;
let postCamera: THREE.OrthographicCamera;
let baseScene: THREE.Scene;
let postScene: THREE.Scene;
let colorPassMesh: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
let brightnessPassMesh: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
let horizontalBlurPassMesh: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
let verticalBlurPassMesh: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
let colorPassTarget: THREE.WebGLRenderTarget;
let brightnessPass: THREE.WebGLRenderTarget;
let horizontalBlurPass: THREE.WebGLRenderTarget;
let verticalBlurPass: THREE.WebGLRenderTarget;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

class GuiUniforms {
    brightnessThresHold: number;

    constructor() {
        this.brightnessThresHold = 0.3;
    }
}

const GaussianDistribution = (pos: THREE.Vector2, rho: number) => {
    return Math.exp(-(pos.x * pos.x + pos.y * pos.y) / (2.0 * rho * rho));
};

type BlurParam = {
    sampleCount: number;
    offset: THREE.Vector3[];
};

const CalcBlurParam = (width: number, height: number, dir: THREE.Vector2, deviation: number) => {
    const offsets = [];

    for (let i = 0; i < 15; i += 1) {
        offsets[i] = new THREE.Vector3(0, 0, 0);
    }

    const result: BlurParam = {
        sampleCount: 0,
        offset: offsets,
    };

    result.sampleCount = 15;
    const tu = 1.0 / width;
    const tv = 1.0 / height;
    result.offset[0].z = GaussianDistribution(new THREE.Vector2(0.0, 0.0), deviation);
    let totalWeight = result.offset[0].z;
    result.offset[0].x = 0.0;
    result.offset[0].y = 0.0;

    for (let i = 1; i < 8; i += 1) {
        result.offset[i].x = dir.x * i * tu;
        result.offset[i].y = dir.y * i * tv;
        const off = new THREE.Vector2(dir.x * i, dir.y * i);
        result.offset[i].z = GaussianDistribution(off, deviation);
        totalWeight += result.offset[i].z * 2.0;
    }

    for (let i = 0; i < 8; i += 1) {
        result.offset[i].z /= totalWeight;
    }

    for (let i = 8; i < 15; i += 1) {
        result.offset[i].x = -result.offset[i - 7].x;
        result.offset[i].y = -result.offset[i - 7].y;
        result.offset[i].z = result.offset[i - 7].z;
    }

    return result;
};

const init = async () => {
    // dat GUI
    const parameters = new GuiUniforms();
    const gui = new dat.GUI();
    gui.add(parameters, 'brightnessThresHold', 0.0, 1.0).onChange(() => {
        brightnessPassMesh.material.uniforms.thresHold.value = parameters.brightnessThresHold;
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
    // const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    // directionalLight.position.set(10, 1, 10);
    // baseScene.add(directionalLight);

    const light = new THREE.AmbientLight(0xffffff, 1.0);
    baseScene.add(light);

    // set shader
    const shaderData = await loadShaders([
        { key: 'planeVertex', path: './assets/shaders/plane.vert' },
        { key: 'colorFragment', path: './assets/shaders/color.frag' },
        { key: 'brightnessFragment', path: './assets/shaders/brightness.frag' },
        { key: 'horizontalBlurFragment', path: './assets/shaders/horizontalBlur.frag' },
        { key: 'verticalBlurFragment', path: './assets/shaders/verticalBlur.frag' },
    ]);

    const planeGeometry = new THREE.PlaneBufferGeometry(5, 5);

    const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
    });

    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);

    planeMesh.position.set(-10, 10, 0);
    baseScene.add(planeMesh);

    // sphere mesh
    const sphereMesh = new THREE.Mesh(
        new THREE.SphereBufferGeometry(10, 32, 32),
        new THREE.MeshStandardMaterial({
            color: 0xffff00,
            metalness: 0.5,
            roughness: 0.3,
        })
    );

    sphereMesh.position.set(10, 10, 0);
    sphereMesh.rotation.set(10, 0, 10);
    baseScene.add(sphereMesh);

    // post processing

    postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postScene = new THREE.Scene();

    const colorPassMaterial = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.colorFragment,
        uniforms: {
            colorPassTexture: {
                value: null,
            },
        },
    });
    const passPlane = new THREE.PlaneBufferGeometry(2, 2);
    colorPassMesh = new THREE.Mesh(passPlane, colorPassMaterial);
    postScene.add(colorPassMesh);

    colorPassTarget = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight);
    // target.texture.minFilter = THREE.LinearFilter;
    // target.texture.magFilter = THREE.LinearFilter;

    const brightnessPassMaterial = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.brightnessFragment,
        uniforms: {
            colorPassTexture: {
                value: null,
            },
            thresHold: {
                value: parameters.brightnessThresHold,
            },
        },
    });
    brightnessPassMesh = new THREE.Mesh(passPlane, brightnessPassMaterial);
    postScene.add(brightnessPassMesh);

    brightnessPass = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight);

    const w = container.clientWidth / 2.0;
    const h = container.clientHeight / 2.0;
    const deviation = 100.0;

    const blurX = CalcBlurParam(w, h, new THREE.Vector2(1.0, 0.0), deviation);

    const horizontalPassMaterial = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.horizontalBlurFragment,
        uniforms: {
            brightnessPassTexture: {
                value: null,
            },
            colorPass: {
                value: null,
            },
            resolution: {
                value: new THREE.Vector2(container.clientWidth, container.clientHeight),
            },
            blurX1: {
                value: blurX.offset[0],
            },
            blurX2: {
                value: blurX.offset[1],
            },
            blurX3: {
                value: blurX.offset[2],
            },
            blurX4: {
                value: blurX.offset[3],
            },
            blurX5: {
                value: blurX.offset[4],
            },
            blurX6: {
                value: blurX.offset[5],
            },
            blurX7: {
                value: blurX.offset[6],
            },
            blurX8: {
                value: blurX.offset[7],
            },
            blurX9: {
                value: blurX.offset[8],
            },
            blurX10: {
                value: blurX.offset[9],
            },
            blurX11: {
                value: blurX.offset[10],
            },
            blurX12: {
                value: blurX.offset[11],
            },
            blurX13: {
                value: blurX.offset[12],
            },
            blurX14: {
                value: blurX.offset[13],
            },
            blurX15: {
                value: blurX.offset[14],
            },
        },
    });
    horizontalBlurPassMesh = new THREE.Mesh(passPlane, horizontalPassMaterial);
    postScene.add(horizontalBlurPassMesh);

    horizontalBlurPass = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight);

    const blurY = CalcBlurParam(w, h, new THREE.Vector2(0.0, 1.0), deviation);

    const verticalPassMaterial = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.verticalBlurFragment,
        uniforms: {
            horizontalPassTexture: {
                value: null,
            },
            colorPassTexture: {
                value: null,
            },
            resolution: {
                value: new THREE.Vector2(container.clientWidth, container.clientHeight),
            },
            blurY1: {
                value: blurY.offset[0],
            },
            blurY2: {
                value: blurY.offset[1],
            },
            blurY3: {
                value: blurY.offset[2],
            },
            blurY4: {
                value: blurY.offset[3],
            },
            blurY5: {
                value: blurY.offset[4],
            },
            blurY6: {
                value: blurY.offset[5],
            },
            blurY7: {
                value: blurY.offset[6],
            },
            blurY8: {
                value: blurY.offset[7],
            },
            blurY9: {
                value: blurY.offset[8],
            },
            blurY10: {
                value: blurY.offset[9],
            },
            blurY11: {
                value: blurY.offset[10],
            },
            blurY12: {
                value: blurY.offset[11],
            },
            blurY13: {
                value: blurY.offset[12],
            },
            blurY14: {
                value: blurY.offset[13],
            },
            blurY15: {
                value: blurY.offset[14],
            },
        },
    });
    verticalBlurPassMesh = new THREE.Mesh(passPlane, verticalPassMaterial);
    postScene.add(verticalBlurPassMesh);

    verticalBlurPass = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight);

    window.addEventListener('resize', () => onWindowResize(baseCamera, renderer), false);
};

const animate = () => {
    requestAnimationFrame(animate);

    // render depth scene into target
    renderer.setRenderTarget(colorPassTarget);
    renderer.render(baseScene, baseCamera);

    colorPassMesh.visible = true;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = false;

    colorPassMesh.material.uniforms.colorPassTexture.value = colorPassTarget.texture;

    renderer.setRenderTarget(brightnessPass);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = true;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = false;

    brightnessPassMesh.material.uniforms.colorPassTexture.value = brightnessPass.texture;

    renderer.setRenderTarget(horizontalBlurPass);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = true;
    verticalBlurPassMesh.visible = false;

    horizontalBlurPassMesh.material.uniforms.brightnessPassTexture.value = horizontalBlurPass.texture;

    renderer.setRenderTarget(verticalBlurPass);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = true;

    verticalBlurPassMesh.material.uniforms.colorPassTexture.value = colorPassTarget.texture;
    verticalBlurPassMesh.material.uniforms.horizontalPassTexture.value = verticalBlurPass.texture;

    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
