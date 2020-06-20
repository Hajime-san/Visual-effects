import * as THREE from '../../../../node_modules/three';
import {OrbitControls} from ',./../../node_modules/three/examples/jsm/controls/OrbitControls';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let geometry: THREE.BufferGeometry;
let material: THREE.PointsMaterial;
// let material2: THREE.PointsMaterial;
let mat: THREE.ShaderMaterial;
let textureLoader: THREE.TextureLoader;
let uniforms: any;
// mesh: THREE.Mesh,
let uvAnimation: FlipBook;
let uvAnimation2: FlipBook;
let time: number;
let delta: THREE.Clock;

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

const loadShaders = async () => {
    const vertexShader = await fetch('./assets/shaders/shader.vert').then(res => res.text());
    const fragmentShader = await fetch('./assets/shaders/shader.frag').then(res => res.text());
    return Promise.all([{vertex: vertexShader, fragment: fragmentShader}]);
};

class FlipBook {
    private texture: THREE.Texture;

    private column: number;

    private row: number;

    private playingFrame: number;

    private numberOfFrame: number;

    private currentDelta: number;

    private currentIndex: number;

    constructor(texture: THREE.Texture, column: number, row: number, playingFrame: number, numberOfFrame?: number) {
        this.texture = texture;
        this.column = column;
        this.row = row;
        this.playingFrame = playingFrame;

        if (typeof numberOfFrame === 'undefined' && column === row) {
            this.numberOfFrame = column * row;
        } else {
            this.numberOfFrame = numberOfFrame;
        }

        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;
        this.texture.repeat.set(1 / this.column, 1 / this.row);

        this.currentDelta = 0;

        this.currentIndex = 0;
    }

    update(deltaTime: number) {
        this.currentDelta += deltaTime;

        while (this.currentDelta > this.playingFrame) {
            this.currentDelta -= this.playingFrame;
            this.currentIndex += 1;

            if (this.currentIndex === this.numberOfFrame) this.currentIndex = 0;
            const currentColumn = this.currentIndex % this.column;
            this.texture.offset.x = currentColumn / this.column;

            const currentRow = Math.floor((this.currentIndex / this.column) * this.column);
            // const currentRow = Math.floor(this.currentIndex / this.column);

            this.texture.offset.y = currentRow / this.row;
        }
    }
}

const init = async () => {
    const container = document.getElementById('canvas');
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 30, 100);

    renderer = new THREE.WebGLRenderer({antialias: true});
    // renderer.setClearColor(0x000000);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    scene = new THREE.Scene();

    time = 0;

    delta = new THREE.Clock();

    geometry = new THREE.BufferGeometry();

    textureLoader = new THREE.TextureLoader();

    const texture = textureLoader.load('./assets/images/T_Smoke_SubUV.png');
    const texture2 = textureLoader.load('./assets/images/T_Smoke_Tiled_D.jpg');

    const meshFloor = new THREE.Mesh(
        new THREE.BoxGeometry(200, 0.1, 200),
        new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0,
            metalness: 0.5,
        })
    );
    scene.add(meshFloor);

    const meshCube = new THREE.Mesh(
        new THREE.SphereGeometry(10, 10, 10),
        new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0,
            metalness: 0.5,
        })
    );
    meshCube.position.set(30, 20, 5);
    scene.add(meshCube);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 100, 10);
    scene.add(directionalLight);
    // const pointLightHelper = new THREE.DirectionalLightHelper(directionalLight, 10);
    // scene.add(pointLightHelper);

    uvAnimation = new FlipBook(texture, 8, 8, 64);

    uvAnimation2 = new FlipBook(texture2, 8, 8, 64);

    const vertices = [];

    for (let i = 0; i < 1; i += 1) {
        const x = 1;
        const y = 1;
        const z = 1;
        vertices.push(x, y, z);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const geo = new THREE.PlaneGeometry(40, 40);

    material = new THREE.PointsMaterial({
        size: 50,
        map: texture,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        transparent: true,
        sizeAttenuation: true,
    });

    // material2 = new THREE.PointsMaterial({
    //     size: 50,
    //     map: texture2,
    //     blending: THREE.MultiplyBlending,
    //     depthTest: true,
    //     transparent: true,
    //     sizeAttenuation: true,
    // });

    uniforms = {
        uTex: {value: texture},
        uTex2: {value: texture2},
        uFixAspect: {
            value: 1 / 1,
        },
        time: {
            value: 0.0,
        },
    };

    const shaders = await loadShaders();

    mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaders[0].vertex,
        fragmentShader: shaders[0].fragment,
        depthTest: true,
        transparent: true,
    });

    const particles = new THREE.Points(geometry, material);

    particles.translateX(-50);
    particles.translateY(20);

    scene.add(particles);

    const mesh = new THREE.Mesh(geo, mat);

    mesh.translateY(20);
    mesh.translateZ(0);

    scene.add(mesh);

    window.addEventListener('resize', onWindowResize, false);
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    uvAnimation.update(1000 * frame);

    uvAnimation2.update(1000 * frame);

    // for (let i = 0; i < 10; i += 1) {
    //   geometry.attributes.position.setXYZ(i, Math.random() * 100 - 50, i + 10 , Math.random() * 100 - 50)
    // }

    // if(material.opacity < 0.01) {
    //   material.opacity = 1;
    //   update = 0;
    // } else {
    //   material.opacity -= 0.01;
    //   update += 1;
    //   geometry.attributes.position.setY(0, update);
    // }

    // geometry.attributes.position.needsUpdate = true;

    time += frame;

    uniforms.time.value = time;

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', () => {
    init();
    animate();
});
