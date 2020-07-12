import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import * as dat from 'dat.gui';
import { loadShaders, ShaderData, onWindowResize, loadTexture, loadGLTF } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
let uniforms: { [uniform: string]: THREE.IUniform };
let time: number;
let delta: THREE.Clock;
let currentFrame = 0;
let shaderData: ShaderData;

// class GuiUniforms {
//     speed: number;

//     constructor() {
//         this.speed = 0.5;
//     }
// }

const getMaxValue = (array: Array<number>) => {
    return array.reduce((a, b) => Math.max(Math.abs(a), Math.abs(b)));
};

const loadEXRtexture = async (url: string) => {
    const loader = new EXRLoader();
    return new Promise((resolve, reject) => {
        loader.setDataType(THREE.FloatType).load(url, texture => {
            resolve(texture);
        });
    });
};

const init = async () => {
    // dat GUI
    // const parameters = new GuiUniforms();
    // const gui = new dat.GUI();
    // gui.add(parameters, 'speed', 0.1, 5.0).onChange(() => {
    //     uniforms.speed.value = parameters.speed;
    // });

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

    const animationTexture = await loadEXRtexture('./assets/images/morphs.exr');

    const normalTexture = await loadTexture('./assets/images/normals.bmp');

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    const model = await loadGLTF('./assets/model/suzanne.glb');

    mesh = model.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;

    // set id for each vertices
    const indicesLength = mesh.geometry.attributes.position.array.length / 4 / 3 + 1;
    const id = new Float32Array(indicesLength);
    for (let i = 0; i < id.length; i += 1) {
        id[i] = i;
    }
    mesh.geometry.setAttribute('_id', new THREE.BufferAttribute(id, 1));

    uniforms = {
        animationTexture: {
            value: animationTexture,
        },
        normalTexture: {
            value: normalTexture,
        },
        time: {
            value: 0.0,
        },
        // set bounding box for correct scale
        boudingBoxMax: {
            value: mesh.geometry.boundingBox.max.x * 0.1,
        },
        // set bounding box for correct scale
        boundingBoxMin: {
            value: mesh.geometry.boundingBox.min.x * 0.1,
        },
        indicesLength: {
            value: indicesLength,
        },
        // total animation frame
        totalFrame: {
            value: 60,
        },
        currentFrame: {
            value: currentFrame,
        },
    };

    mesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.fragment,
        depthTest: true,
        transparent: true,
    });

    model.scene.position.set(0, 10, 0);
    scene.add(model.scene);
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    mesh.material.uniforms.time.value = time;

    currentFrame += 1;

    mesh.material.uniforms.currentFrame.value = currentFrame;

    if (currentFrame === mesh.material.uniforms.totalFrame.value) {
        currentFrame = 0;
    }

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
