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
let horizontalBlurPassMesh2: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
let verticalBlurPassMesh2: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
let horizontalBlurPassMesh3: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
let verticalBlurPassMesh3: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
let compositePassMesh: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
let colorPassTarget: THREE.WebGLRenderTarget;
let brightnessPass: THREE.WebGLRenderTarget;
let horizontalBlurPass: THREE.WebGLRenderTarget;
let verticalBlurPass: THREE.WebGLRenderTarget;
let horizontalBlurPass2: THREE.WebGLRenderTarget;
let verticalBlurPass2: THREE.WebGLRenderTarget;
let horizontalBlurPass3: THREE.WebGLRenderTarget;
let verticalBlurPass3: THREE.WebGLRenderTarget;
let compositePass: THREE.WebGLRenderTarget;
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

const CalcBlurParam = (width: number, height: number, dir: THREE.Vector2, deviation: number, multiply: number) => {
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
    result.offset[0].z = GaussianDistribution(new THREE.Vector2(0.0, 0.0), deviation) * multiply;
    let totalWeight = result.offset[0].z;
    result.offset[0].x = 0.0;
    result.offset[0].y = 0.0;

    for (let i = 1; i < 8; i += 1) {
        result.offset[i].x = dir.x * i * tu;
        result.offset[i].y = dir.y * i * tv;
        const off = new THREE.Vector2(dir.x * i, dir.y * i);
        result.offset[i].z = GaussianDistribution(off, deviation) * multiply;
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
        { key: 'blurFragment', path: './assets/shaders/blur.frag' },
        { key: 'compositePassFragment', path: './assets/shaders/compositePass.frag' },
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

    const blurPassWidth = container.clientWidth / 4.0;
    const blurPassHeight = container.clientHeight / 4.0;

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

    brightnessPass = new THREE.WebGLRenderTarget(blurPassWidth, blurPassHeight);

    const deviation = 50;

    const blurX = CalcBlurParam(blurPassWidth, blurPassHeight, new THREE.Vector2(1.0, 0.0), deviation, 2.0);

    const horizontalPassMaterial = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            blurPass: {
                value: null,
            },
            deviation: {
                value: blurX.offset,
            },
        },
    });
    horizontalBlurPassMesh = new THREE.Mesh(passPlane, horizontalPassMaterial);
    postScene.add(horizontalBlurPassMesh);

    horizontalBlurPass = new THREE.WebGLRenderTarget(blurPassWidth, blurPassHeight);

    const blurY = CalcBlurParam(blurPassWidth, blurPassHeight, new THREE.Vector2(0.0, 1.0), deviation, 2.0);

    const verticalPassMaterial = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            blurPass: {
                value: null,
            },
            deviation: {
                value: blurY.offset,
            },
        },
    });
    verticalBlurPassMesh = new THREE.Mesh(passPlane, verticalPassMaterial);
    postScene.add(verticalBlurPassMesh);

    verticalBlurPass = new THREE.WebGLRenderTarget(blurPassWidth, blurPassHeight);

    const blurX2 = CalcBlurParam(blurPassWidth / 2.0, blurPassHeight / 2.0, new THREE.Vector2(1.0, 0.0), deviation, 4.0);

    const horizontalPassMaterial2 = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            blurPass: {
                value: null,
            },
            deviation: {
                value: blurX2.offset,
            },
        },
    });
    horizontalBlurPassMesh2 = new THREE.Mesh(passPlane, horizontalPassMaterial2);
    postScene.add(horizontalBlurPassMesh2);

    horizontalBlurPass2 = new THREE.WebGLRenderTarget(blurPassWidth / 2.0, blurPassHeight / 2.0);


    const blurY2 = CalcBlurParam(blurPassWidth / 2.0, blurPassHeight / 2.0, new THREE.Vector2(0.0, 1.0), deviation, 4.0);

    const verticalPassMaterial2 = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            blurPass: {
                value: null,
            },
            deviation: {
                value: blurY2.offset,
            },
        },
    });
    verticalBlurPassMesh2 = new THREE.Mesh(passPlane, verticalPassMaterial2);
    postScene.add(verticalBlurPassMesh2);

    verticalBlurPass2 = new THREE.WebGLRenderTarget(blurPassWidth / 2.0, blurPassHeight / 2.0);


    const blurX3 = CalcBlurParam(blurPassWidth / 4.0, blurPassHeight / 4.0, new THREE.Vector2(1.0, 0.0), deviation, 8.0);

    const horizontalPassMaterial3 = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            blurPass: {
                value: null,
            },
            deviation: {
                value: blurX3.offset,
            },
        },
    });
    horizontalBlurPassMesh3 = new THREE.Mesh(passPlane, horizontalPassMaterial3);
    postScene.add(horizontalBlurPassMesh3);

    horizontalBlurPass3 = new THREE.WebGLRenderTarget(blurPassWidth / 4.0, blurPassHeight / 4.0);


    const blurY3 = CalcBlurParam(blurPassWidth / 4.0, blurPassHeight / 4.0, new THREE.Vector2(0.0, 1.0), deviation, 8.0);

    const verticalPassMaterial3 = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            blurPass: {
                value: null,
            },
            deviation: {
                value: blurY3.offset,
            },
        },
    });
    verticalBlurPassMesh3 = new THREE.Mesh(passPlane, verticalPassMaterial3);
    postScene.add(verticalBlurPassMesh3);

    verticalBlurPass3 = new THREE.WebGLRenderTarget(blurPassWidth / 4.0, blurPassHeight / 4.0);

    const compositePassMaterial = new THREE.ShaderMaterial({
        vertexShader: shaderData.planeVertex,
        fragmentShader: shaderData.compositePassFragment,
        uniforms: {
            colorPassTexture: {
                value: null,
            },
            blurBuffer0: {
                value: null,
            },
            blurBuffer1: {
                value: null,
            },
            blurBuffer2: {
                value: null,
            },
            blurBuffer3: {
                value: null,
            },
            blurBuffer4: {
                value: null,
            },
            blurBuffer5: {
                value: null,
            },
            compositePass: {
                value: null,
            },
        },
    });
    compositePassMesh = new THREE.Mesh(passPlane, compositePassMaterial);
    postScene.add(compositePassMesh);

    compositePass = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight);

    window.addEventListener('resize', () => onWindowResize(baseCamera, renderer), false);
};

const animate = () => {
    requestAnimationFrame(animate);

    // render color pass
    renderer.setRenderTarget(colorPassTarget);
    renderer.render(baseScene, baseCamera);

    colorPassMesh.visible = true;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = false;
    horizontalBlurPassMesh2.visible = false;
    verticalBlurPassMesh2.visible = false;
    horizontalBlurPassMesh3.visible = false;
    verticalBlurPassMesh3.visible = false;
    compositePassMesh.visible = false;

    colorPassMesh.material.uniforms.colorPassTexture.value = colorPassTarget.texture;

    renderer.setRenderTarget(brightnessPass);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = true;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = false;
    horizontalBlurPassMesh2.visible = false;
    verticalBlurPassMesh2.visible = false;
    horizontalBlurPassMesh3.visible = false;
    verticalBlurPassMesh3.visible = false;
    compositePassMesh.visible = false;

    brightnessPassMesh.material.uniforms.colorPassTexture.value = brightnessPass.texture;

    renderer.setRenderTarget(horizontalBlurPass);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = true;
    verticalBlurPassMesh.visible = false;
    horizontalBlurPassMesh2.visible = false;
    verticalBlurPassMesh2.visible = false;
    horizontalBlurPassMesh3.visible = false;
    verticalBlurPassMesh3.visible = false;
    compositePassMesh.visible = false;

    horizontalBlurPassMesh.material.uniforms.blurPass.value = horizontalBlurPass.texture;

    renderer.setRenderTarget(verticalBlurPass);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = true;
    horizontalBlurPassMesh2.visible = false;
    verticalBlurPassMesh2.visible = false;
    horizontalBlurPassMesh3.visible = false;
    verticalBlurPassMesh3.visible = false;
    compositePassMesh.visible = false;

    verticalBlurPassMesh.material.uniforms.blurPass.value = verticalBlurPass.texture;

    renderer.setRenderTarget(horizontalBlurPass2);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = false;
    horizontalBlurPassMesh2.visible = true;
    verticalBlurPassMesh2.visible = false;
    horizontalBlurPassMesh3.visible = false;
    verticalBlurPassMesh3.visible = false;
    compositePassMesh.visible = false;

    horizontalBlurPassMesh2.material.uniforms.blurPass.value = horizontalBlurPass2.texture;

    renderer.setRenderTarget(verticalBlurPass2);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = false;
    horizontalBlurPassMesh2.visible = false;
    verticalBlurPassMesh2.visible = true;
    horizontalBlurPassMesh3.visible = false;
    verticalBlurPassMesh3.visible = false;
    compositePassMesh.visible = false;

    verticalBlurPassMesh2.material.uniforms.blurPass.value = verticalBlurPass2.texture;

    renderer.setRenderTarget(horizontalBlurPass3);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = false;
    horizontalBlurPassMesh2.visible = false;
    verticalBlurPassMesh2.visible = false;
    horizontalBlurPassMesh3.visible = true;
    verticalBlurPassMesh3.visible = false;
    compositePassMesh.visible = false;

    horizontalBlurPassMesh3.material.uniforms.blurPass.value = horizontalBlurPass3.texture;

    renderer.setRenderTarget(verticalBlurPass3);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = false;
    horizontalBlurPassMesh2.visible = false;
    verticalBlurPassMesh2.visible = false;
    horizontalBlurPassMesh3.visible = false;
    verticalBlurPassMesh3.visible = true;
    compositePassMesh.visible = false;

    verticalBlurPassMesh3.material.uniforms.blurPass.value = verticalBlurPass3.texture;

    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);

    colorPassMesh.visible = false;
    brightnessPassMesh.visible = false;
    horizontalBlurPassMesh.visible = false;
    verticalBlurPassMesh.visible = false;
    horizontalBlurPassMesh2.visible = false;
    verticalBlurPassMesh2.visible = false;
    horizontalBlurPassMesh3.visible = false;
    verticalBlurPassMesh3.visible = false;
    compositePassMesh.visible = true;

    compositePassMesh.material.uniforms.colorPassTexture.value = colorPassTarget.texture;
    compositePassMesh.material.uniforms.blurBuffer0.value = horizontalBlurPass.texture;
    compositePassMesh.material.uniforms.blurBuffer1.value = verticalBlurPass.texture;
    compositePassMesh.material.uniforms.blurBuffer2.value = horizontalBlurPass2.texture;
    compositePassMesh.material.uniforms.blurBuffer3.value = verticalBlurPass2.texture;
    compositePassMesh.material.uniforms.blurBuffer4.value = horizontalBlurPass3.texture;
    compositePassMesh.material.uniforms.blurBuffer5.value = verticalBlurPass3.texture;
    compositePassMesh.material.uniforms.compositePass.value = compositePass.texture;

    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
