import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import * as dat from 'dat.gui';
import { loadShaders, ShaderData, onWindowResize } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let mesh: any;
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
    camera.position.set(0, 10, 40);

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

    const loader = new GLTFLoader();

    // load textures
    const exrLoader = new EXRLoader();

    let animationTexture;

    exrLoader.setDataType(THREE.FloatType).load('./assets/images/morphs.exr', tex => {
        animationTexture = tex;

        tex.dispose();
    });

    const textureLoader = new THREE.TextureLoader();

    const normalTexture = textureLoader.load('./assets/images/normals.bmp');

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

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
        boudingBoxMax: {
            value: 0,
        },
        boundingBoxMin: {
            value: 0,
        },
        indicesLength: {
            value: 0,
        },
        totalFrame: {
            value: 60,
        },
        currentFrame: {
            value: currentFrame,
        },
    };

    loader.load('./assets/model/suzanne.glb', gltf => {
        mesh = gltf.scene.children[0] as THREE.Mesh;

        const indicesLength = mesh.geometry.attributes.position.array.length / 4 / 3 + 1;

        const id = new Float32Array(indicesLength);

        for (let i = 0; i < id.length; i += 1) {
            id[i] = i;
        }

        mesh.geometry.setAttribute('_id', new THREE.BufferAttribute(id, 1));

        uniforms.boudingBoxMax.value = mesh.geometry.boundingBox.max.x * 0.01;

        uniforms.boundingBoxMin.value = mesh.geometry.boundingBox.min.x * 0.01;

        uniforms.indicesLength.value = indicesLength;

        mesh.material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shaderData.vertex,
            fragmentShader: shaderData.fragment,
            depthTest: true,
            transparent: true,
        });

        const model = gltf.scene;
        model.position.set(0, 10, 0);
        model.scale.set(0.1, 0.1, 0.1);
        scene.add(model);
    });
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
