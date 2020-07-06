import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { loadShaders, ShaderData, onWindowResize } from '../../../modules/Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let material: THREE.ShaderMaterial;
let mesh: any;
let uniforms: { [uniform: string]: THREE.IUniform };
let time: number;
let delta: THREE.Clock;
let shaderData: ShaderData;

const init = async () => {
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

    const loader = new GLTFLoader();

    // set uniform variable

    // set shader
    shaderData = await loadShaders([
        { key: 'vertex', path: './assets/shaders/shader.vert' },
        { key: 'fragment', path: './assets/shaders/shader.frag' },
    ]);

    // frame mix animation particle

    uniforms = {
        time: {
            value: 0.0,
        },
        speed: {
            value: 0.5,
        },
        scale: {
            value: new THREE.Vector3(1, 1, 1),
        },
    };

    loader.load('./assets/model/smoke.glb', gltf => {
        mesh = gltf.scene.children[0] as THREE.Mesh;
        mesh.material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shaderData.vertex,
            fragmentShader: shaderData.fragment,
            depthTest: true,
            transparent: true,
        });

        const model = gltf.scene;
        model.position.set(0, 5, 0);
        model.scale.set(10, 10, 10);
        scene.add(model);
    });

    // material = new THREE.ShaderMaterial({
    //     uniforms,
    //     vertexShader: shaderData.vertex,
    //     fragmentShader: shaderData.fragment,
    //     depthTest: true,
    //     transparent: true,
    // });
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    // mesh.material.uniforms.time.value = time;

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
