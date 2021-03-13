import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { loadShaders, loadTexture, onWindowResize } from '../../../modules/Util';
import { RenderPassProvider } from './RenderPassProvider';

let baseCamera: THREE.PerspectiveCamera;
let baseScene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let renderPassProvider: RenderPassProvider;

// let subScene: THREE.Scene;
// let subCamera: THREE.OrthographicCamera;
// const buffers = [];

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
    // const gui = new dat.GUI();
    // gui.add(parameters, 'brightnessThresHold', 0.0, 1.0).onChange(() => {
    //     brightnessPassMesh.material.uniforms.thresHold.value = parameters.brightnessThresHold;
    // });

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
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 1, 10);
    baseScene.add(directionalLight);

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

    const colorBuffer = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight);

    let blurPassWidth = container.clientWidth / 4.0;
    let blurPassHeight = container.clientHeight / 4.0;

    const brightnessPass = new THREE.WebGLRenderTarget(blurPassWidth, blurPassHeight);

    const deviation = 50;

    let blurX = CalcBlurParam(blurPassWidth, blurPassHeight, new THREE.Vector2(1.0, 0.0), deviation, 2.0);

    const horizontalBlurPass = new THREE.WebGLRenderTarget(blurPassWidth, blurPassHeight);

    let blurY = CalcBlurParam(blurPassWidth, blurPassHeight, new THREE.Vector2(0.0, 1.0), deviation, 2.0);

    const verticalBlurPass = new THREE.WebGLRenderTarget(blurPassWidth, blurPassHeight);

    let blurPassHalfWidth = blurPassWidth / 2.0;
    let blurPassHalfHeight = blurPassHeight / 2.0;

    let blurX2 = CalcBlurParam(blurPassHalfWidth, blurPassHalfHeight, new THREE.Vector2(1.0, 0.0), deviation, 4.0);

    const horizontalBlurPass2 = new THREE.WebGLRenderTarget(blurPassHalfWidth, blurPassHalfHeight);

    let blurY2 = CalcBlurParam(blurPassHalfWidth, blurPassHalfHeight, new THREE.Vector2(0.0, 1.0), deviation, 4.0);

    const verticalBlurPass2 = new THREE.WebGLRenderTarget(blurPassHalfWidth, blurPassHalfHeight);

    let blurPassQuarterWidth = blurPassWidth / 4.0;
    let blurPassQuarterHeight = blurPassHeight / 4.0;

    let blurX3 = CalcBlurParam(blurPassQuarterWidth, blurPassQuarterHeight, new THREE.Vector2(1.0, 0.0), deviation, 8.0);

    const horizontalBlurPass3 = new THREE.WebGLRenderTarget(blurPassQuarterWidth, blurPassQuarterHeight);

    let blurY3 = CalcBlurParam(blurPassQuarterWidth, blurPassQuarterHeight, new THREE.Vector2(0.0, 1.0), deviation, 8.0);

    const verticalBlurPass3 = new THREE.WebGLRenderTarget(blurPassQuarterWidth, blurPassQuarterHeight);

    const compositeBuffer = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight);

    renderPassProvider = new RenderPassProvider(renderer, baseScene, baseCamera);

    await renderPassProvider.addRenderPass('colorBuffer', {
        renderTargetRelation: [{ renderTarget: colorBuffer, uniformKeyName: 'colorBuffer', actualRenderTarget: true }],
        fragmentShader: shaderData.colorFragment,
    });

    await renderPassProvider.addRenderPass('brightnessPass', {
        renderTargetRelation: [{ renderTarget: brightnessPass, uniformKeyName: 'colorBuffer', actualRenderTarget: true }],
        fragmentShader: shaderData.brightnessFragment,
        uniforms: {
            thresHold: {
                value: parameters.brightnessThresHold,
            },
        },
    });

    await renderPassProvider.addRenderPass('horizontalBlurPass', {
        renderTargetRelation: [{ renderTarget: horizontalBlurPass, uniformKeyName: 'colorBuffer', actualRenderTarget: true }],
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            deviation: {
                value: blurX.offset,
            },
        },
    });

    await renderPassProvider.addRenderPass('verticalBlurPass', {
        renderTargetRelation: [{ renderTarget: verticalBlurPass, uniformKeyName: 'colorBuffer', actualRenderTarget: true }],
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            deviation: {
                value: blurY.offset,
            },
        },
    });

    await renderPassProvider.addRenderPass('horizontalBlurPass2', {
        renderTargetRelation: [{ renderTarget: horizontalBlurPass2, uniformKeyName: 'colorBuffer', actualRenderTarget: true }],
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            deviation: {
                value: blurX2.offset,
            },
        },
    });

    await renderPassProvider.addRenderPass('verticalBlurPass2', {
        renderTargetRelation: [{ renderTarget: verticalBlurPass2, uniformKeyName: 'colorBuffer', actualRenderTarget: true }],
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            deviation: {
                value: blurY2.offset,
            },
        },
    });

    await renderPassProvider.addRenderPass('horizontalBlurPass3', {
        renderTargetRelation: [{ renderTarget: horizontalBlurPass3, uniformKeyName: 'colorBuffer', actualRenderTarget: true }],
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            deviation: {
                value: blurX3.offset,
            },
        },
    });

    await renderPassProvider.addRenderPass('verticalBlurPass3', {
        renderTargetRelation: [{ renderTarget: verticalBlurPass3, uniformKeyName: 'colorBuffer', actualRenderTarget: true }],
        fragmentShader: shaderData.blurFragment,
        uniforms: {
            deviation: {
                value: blurY3.offset,
            },
        },
    });

    await renderPassProvider.addRenderPass('compositeBuffer', {
        renderTargetRelation: [
            { renderTarget: colorBuffer, uniformKeyName: 'sceneBuffer' },
            { renderTarget: horizontalBlurPass2, uniformKeyName: 'colorBuffer1' },
            { renderTarget: horizontalBlurPass3, uniformKeyName: 'colorBuffer2' },
            { renderTarget: compositeBuffer, uniformKeyName: 'colorBuffer3', actualRenderTarget: true },
        ],
        fragmentShader: shaderData.compositePassFragment,
    });

    const horizontalBlurPassMesh = renderPassProvider.getMeshByRenderPassName('horizontalBlurPass');

    const verticalBlurPassMesh = renderPassProvider.getMeshByRenderPassName('verticalBlurPass');

    const horizontalBlurPass2Mesh = renderPassProvider.getMeshByRenderPassName('horizontalBlurPass2');

    const verticalBlurPass2Mesh = renderPassProvider.getMeshByRenderPassName('verticalBlurPass2');

    const horizontalBlurPass3Mesh = renderPassProvider.getMeshByRenderPassName('horizontalBlurPass3');

    const verticalBlurPass3Mesh = renderPassProvider.getMeshByRenderPassName('verticalBlurPass3');

    window.addEventListener(
        'resize',
        () => {
            onWindowResize(baseCamera, renderer);

            // resize
            blurPassWidth = container.clientWidth / 4.0;
            blurPassHeight = container.clientHeight / 4.0;

            colorBuffer.width = container.clientWidth;
            colorBuffer.height = container.clientHeight;

            brightnessPass.width = blurPassWidth;
            brightnessPass.height = blurPassHeight;

            horizontalBlurPass.width = blurPassWidth;
            horizontalBlurPass.height = blurPassHeight;

            verticalBlurPass.width = blurPassWidth;
            verticalBlurPass.height = blurPassHeight;

            blurPassHalfWidth = blurPassWidth / 2.0;
            blurPassHalfHeight = blurPassHeight / 2.0;

            horizontalBlurPass2.width = blurPassHalfWidth;
            horizontalBlurPass2.height = blurPassHalfHeight;

            verticalBlurPass2.width = blurPassHalfWidth;
            verticalBlurPass2.height = blurPassHalfHeight;

            blurPassQuarterWidth = blurPassWidth / 4.0;
            blurPassQuarterHeight = blurPassHeight / 4.0;

            horizontalBlurPass3.width = blurPassQuarterWidth;
            horizontalBlurPass3.height = blurPassQuarterHeight;

            verticalBlurPass3.width = blurPassQuarterWidth;
            verticalBlurPass3.height = blurPassQuarterHeight;

            compositeBuffer.width = container.clientWidth;
            compositeBuffer.height = container.clientHeight;

            // update uniform variable
            blurX = CalcBlurParam(blurPassWidth, blurPassHeight, new THREE.Vector2(1.0, 0.0), deviation, 2.0);
            blurY = CalcBlurParam(blurPassWidth, blurPassHeight, new THREE.Vector2(0.0, 1.0), deviation, 2.0);

            blurX2 = CalcBlurParam(blurPassHalfWidth, blurPassHalfHeight, new THREE.Vector2(1.0, 0.0), deviation, 4.0);
            blurY2 = CalcBlurParam(blurPassHalfWidth, blurPassHalfHeight, new THREE.Vector2(0.0, 1.0), deviation, 4.0);

            blurX3 = CalcBlurParam(blurPassQuarterWidth, blurPassQuarterHeight, new THREE.Vector2(1.0, 0.0), deviation, 8.0);
            blurY3 = CalcBlurParam(blurPassQuarterWidth, blurPassQuarterHeight, new THREE.Vector2(0.0, 1.0), deviation, 8.0);

            horizontalBlurPassMesh.material.uniforms.deviation.value = blurX.offset;
            verticalBlurPassMesh.material.uniforms.deviation.value = blurY.offset;
            horizontalBlurPass2Mesh.material.uniforms.deviation.value = blurX2.offset;
            verticalBlurPass2Mesh.material.uniforms.deviation.value = blurY2.offset;
            horizontalBlurPass3Mesh.material.uniforms.deviation.value = blurX3.offset;
            verticalBlurPass3Mesh.material.uniforms.deviation.value = blurY3.offset;
        },
        false
    );

    // sub scene
    // subScene = new THREE.Scene();
    // subCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // buffers[0] = {};
    // buffers[0].renderTarget = colorPass;
    // buffers[0].geometry = passPlane;
    // buffers[0].material = colorPassMaterial;
    // buffers[0].mesh = {};
    // buffers[0].domElement = 'colorPass';
    // buffers[1] = {};
    // buffers[1].renderTarget = brightnessPass;
    // buffers[1].geometry = passPlane;
    // buffers[1].material = brightnessPassMaterial;
    // buffers[1].mesh = {};
    // buffers[1].domElement = 'brightnessPass';
    // buffers[2] = {};
    // buffers[2].renderTarget = horizontalBlurPass;
    // buffers[2].geometry = passPlane;
    // buffers[2].material = horizontalPassMaterial;
    // buffers[2].mesh = {};
    // buffers[2].domElement = 'horizontalPass';

    // const wrapperElement = document.createElement('ul');
    // wrapperElement.setAttribute('class', 'bufferWrapper');
    // document.body.insertAdjacentElement('afterbegin', wrapperElement);

    // for (let i = 0; i < buffers.length; i += 1) {
    //     const buffer = buffers[i];

    //     const elementWidth = container.clientWidth / 8;
    //     const elementHeight = container.clientHeight / 8;

    //     const listElement = document.createElement('li');
    //     listElement.setAttribute('class', 'bufferItem');
    //     listElement.setAttribute('width', String(elementWidth));
    //     listElement.setAttribute('height', String(elementHeight));

    //     wrapperElement.insertAdjacentElement('beforeend', listElement);

    //     buffer.renderer = new THREE.WebGLRenderer();
    //     buffer.renderer.setPixelRatio(1);
    //     buffer.renderer.setSize(elementWidth, elementHeight);
    //     listElement.appendChild(buffer.renderer.domElement);

    //     buffer.mesh = new THREE.Mesh(buffer.geometry.clone(), buffer.material.clone());

    //     subScene.add(buffer.mesh);
    // }
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();

    // animate();

    renderPassProvider.tick();

    // subAnimate();
});

// const animate = () => {
// requestAnimationFrame(animate);

// render color pass
// renderer.setRenderTarget(colorPass);
// renderer.render(baseScene, baseCamera);

// colorPassMesh.visible = true;
// brightnessPassMesh.visible = false;
// horizontalBlurPassMesh.visible = false;
// verticalBlurPassMesh.visible = false;
// horizontalBlurPassMesh2.visible = false;
// verticalBlurPassMesh2.visible = false;
// horizontalBlurPassMesh3.visible = false;
// verticalBlurPassMesh3.visible = false;
// compositePassMesh.visible = false;

// colorPassMesh.material.uniforms.colorPass.value = colorPass.texture;

// renderer.setRenderTarget(brightnessPass);
// renderer.render(postScene, postCamera);

// colorPassMesh.visible = false;
// brightnessPassMesh.visible = true;
// horizontalBlurPassMesh.visible = false;
// verticalBlurPassMesh.visible = false;
// horizontalBlurPassMesh2.visible = false;
// verticalBlurPassMesh2.visible = false;
// horizontalBlurPassMesh3.visible = false;
// verticalBlurPassMesh3.visible = false;
// compositePassMesh.visible = false;

// brightnessPassMesh.material.uniforms.colorPassTexture.value = brightnessPass.texture;

// renderer.setRenderTarget(horizontalBlurPass);
// renderer.render(postScene, postCamera);

// colorPassMesh.visible = false;
// brightnessPassMesh.visible = false;
// horizontalBlurPassMesh.visible = true;
// verticalBlurPassMesh.visible = false;
// horizontalBlurPassMesh2.visible = false;
// verticalBlurPassMesh2.visible = false;
// horizontalBlurPassMesh3.visible = false;
// verticalBlurPassMesh3.visible = false;
// compositePassMesh.visible = false;

// horizontalBlurPassMesh.material.uniforms.blurPass.value = horizontalBlurPass.texture;

// renderer.setRenderTarget(verticalBlurPass);
// renderer.render(postScene, postCamera);

// colorPassMesh.visible = false;
// brightnessPassMesh.visible = false;
// horizontalBlurPassMesh.visible = false;
// verticalBlurPassMesh.visible = true;
// horizontalBlurPassMesh2.visible = false;
// verticalBlurPassMesh2.visible = false;
// horizontalBlurPassMesh3.visible = false;
// verticalBlurPassMesh3.visible = false;
// compositePassMesh.visible = false;

// verticalBlurPassMesh.material.uniforms.blurPass.value = verticalBlurPass.texture;

// renderer.setRenderTarget(horizontalBlurPass2);
// renderer.render(postScene, postCamera);

// colorPassMesh.visible = false;
// brightnessPassMesh.visible = false;
// horizontalBlurPassMesh.visible = false;
// verticalBlurPassMesh.visible = false;
// horizontalBlurPassMesh2.visible = true;
// verticalBlurPassMesh2.visible = false;
// horizontalBlurPassMesh3.visible = false;
// verticalBlurPassMesh3.visible = false;
// compositePassMesh.visible = false;

// horizontalBlurPassMesh2.material.uniforms.blurPass.value = horizontalBlurPass2.texture;

// renderer.setRenderTarget(verticalBlurPass2);
// renderer.render(postScene, postCamera);

// colorPassMesh.visible = false;
// brightnessPassMesh.visible = false;
// horizontalBlurPassMesh.visible = false;
// verticalBlurPassMesh.visible = false;
// horizontalBlurPassMesh2.visible = false;
// verticalBlurPassMesh2.visible = true;
// horizontalBlurPassMesh3.visible = false;
// verticalBlurPassMesh3.visible = false;
// compositePassMesh.visible = false;

// verticalBlurPassMesh2.material.uniforms.blurPass.value = verticalBlurPass2.texture;

// renderer.setRenderTarget(horizontalBlurPass3);
// renderer.render(postScene, postCamera);

// colorPassMesh.visible = false;
// brightnessPassMesh.visible = false;
// horizontalBlurPassMesh.visible = false;
// verticalBlurPassMesh.visible = false;
// horizontalBlurPassMesh2.visible = false;
// verticalBlurPassMesh2.visible = false;
// horizontalBlurPassMesh3.visible = true;
// verticalBlurPassMesh3.visible = false;
// compositePassMesh.visible = false;

// horizontalBlurPassMesh3.material.uniforms.blurPass.value = horizontalBlurPass3.texture;

// renderer.setRenderTarget(verticalBlurPass3);
// renderer.render(postScene, postCamera);

// colorPassMesh.visible = false;
// brightnessPassMesh.visible = false;
// horizontalBlurPassMesh.visible = false;
// verticalBlurPassMesh.visible = false;
// horizontalBlurPassMesh2.visible = false;
// verticalBlurPassMesh2.visible = false;
// horizontalBlurPassMesh3.visible = false;
// verticalBlurPassMesh3.visible = true;
// compositePassMesh.visible = false;

// verticalBlurPassMesh3.material.uniforms.blurPass.value = verticalBlurPass3.texture;

// renderer.setRenderTarget(compositePass);
// renderer.render(postScene, postCamera);

// colorPassMesh.visible = false;
// brightnessPassMesh.visible = false;
// horizontalBlurPassMesh.visible = false;
// verticalBlurPassMesh.visible = false;
// horizontalBlurPassMesh2.visible = false;
// verticalBlurPassMesh2.visible = false;
// horizontalBlurPassMesh3.visible = false;
// verticalBlurPassMesh3.visible = false;
// compositePassMesh.visible = true;

// compositePassMesh.material.uniforms.colorPassTexture.value = colorPass.texture;
// compositePassMesh.material.uniforms.colorBuffer1.value = horizontalBlurPass2.texture;
// compositePassMesh.material.uniforms.colorBuffer2.value = horizontalBlurPass3.texture;
// compositePassMesh.material.uniforms.colorBuffer3.value = compositePass.texture;

// renderer.setRenderTarget(null);
// renderer.render(postScene, postCamera);
// };

// const subAnimate = () => {
//     requestAnimationFrame(subAnimate);

//     for (let i = 0; i < buffers.length; i += 1) {
//         const buffer = buffers[i];

//         buffer.renderer.setRenderTarget(buffer.renderTarget);
//         buffer.renderer.render(baseScene, baseCamera);

//         buffer.mesh.material.uniforms.colorPassTexture.value = buffer.renderTarget.texture;

//         buffer.renderer.setRenderTarget(null);
//         buffer.renderer.render(subScene, subCamera);
//     }
// };
