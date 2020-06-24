import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let planeGeometry: THREE.PlaneGeometry;
let shaderMaterial: THREE.ShaderMaterial;
let singleSmoke: THREE.Mesh;
let smokeParticlesWrapper: THREE.Group;
let velocities: any;
let smokeGeometries: Array<THREE.PlaneGeometry>;
let smokeParticleMaterial: THREE.ShaderMaterial;
let textureLoader: THREE.TextureLoader;
let uniforms: any;
let time: number;
let particleUniforms: any;
let delta: THREE.Clock;
let lifeTime: number;
let particleOwnLifeTime: number;
let delay: number;
let previousTime: number;
let currentTime: number;

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

const loadShaders = async () => {
    const vertexShader = await fetch('./assets/shaders/shader.vert').then(res => res.text());
    const fragmentShader = await fetch('./assets/shaders/shader.frag').then(res => res.text());
    const smokeParticleFrag = await fetch('./assets/shaders/smokeParticles.frag').then(res => res.text());
    return Promise.all([{vertex: vertexShader, fragment: fragmentShader, smokeParticleFragment: smokeParticleFrag}]);
};

// text sprite
const labelMaterial = (text: string) => {
    const canvas = document.createElement('canvas');

    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontSize = 36;

    ctx.fillStyle = '#000';
    ctx.font = `${fontSize}pt Georgia`;
    // ctx.textAlign = 'center';

    const textWidth = Math.floor(Number(ctx.measureText(text).width));

    const horizontalCenter = canvas.width / 2 - textWidth / 2;

    const verticalCenter = canvas.height / 2 + fontSize / 2;

    ctx.fillText(text, horizontalCenter, verticalCenter);

    const map = new THREE.CanvasTexture(canvas);

    return new THREE.SpriteMaterial({map});
};

const rangedRandom = (max: number, min: number) => {
    return Math.random() * (max - min) + min;
};

const init = async () => {
    // intial settings
    const container = document.getElementById('canvas');
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 20, 50);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    scene = new THREE.Scene();

    time = 0;

    delta = new THREE.Clock();

    window.addEventListener('resize', onWindowResize, false);

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
    directionalLight.position.set(1, 100, 10);
    scene.add(directionalLight);

    // load textures
    textureLoader = new THREE.TextureLoader();

    const loopAnimationTexture = textureLoader.load('./assets/images/T_Smoke_SubUV.png');
    const baseColorTexture = textureLoader.load('./assets/images/T_Smoke_Tiled_D.jpg');

    // set uniform variables
    uniforms = {
        loopAnimationTexture: {value: loopAnimationTexture},
        baseColorTexture: {value: baseColorTexture},
        time: {
            value: 0.0,
        },
        speed: {
            value: 1.0,
        },
        mixNextFrame: {
            value: 1,
        },
        COLUMN: {
            value: 8,
        },
        ROW: {
            value: 8,
        },
        scale: {
            value: new THREE.Vector3(1, 1, 1),
        },
    };

    // set shader
    const shaders = await loadShaders();

    shaderMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaders[0].vertex,
        fragmentShader: shaders[0].fragment,
        depthTest: true,
        transparent: true,
    });

    // frame mix animation particle
    planeGeometry = new THREE.PlaneGeometry(20, 20);

    singleSmoke = new THREE.Mesh(planeGeometry, shaderMaterial);

    singleSmoke.position.set(0, 10, 0);

    scene.add(singleSmoke);

    const spriteMixedFrameText = new THREE.Sprite(labelMaterial('mixed two frame'));
    spriteMixedFrameText.position.set(0, 25, 0);
    spriteMixedFrameText.scale.set(10, 10, 10);

    scene.add(spriteMixedFrameText);

    // no-mix
    const nonMixFrameGeometry = new THREE.PlaneGeometry(20, 20);

    uniforms.mixNextFrame.value = 0;

    const noMixFrameParticles = new THREE.Mesh(nonMixFrameGeometry, shaderMaterial);

    noMixFrameParticles.position.set(25, 10, 0);

    scene.add(noMixFrameParticles);

    const spriteSingleFrameText = new THREE.Sprite(labelMaterial('single frame'));
    spriteSingleFrameText.position.set(25, 25, 0);
    spriteSingleFrameText.scale.set(10, 10, 10);

    scene.add(spriteSingleFrameText);

    // multiple particles

    velocities = [];

    smokeParticlesWrapper = new THREE.Group();

    particleUniforms = {
        loopAnimationTexture: {value: loopAnimationTexture},
        baseColorTexture: {value: baseColorTexture},
        time: {
            value: 0.0,
        },
        speed: {
            value: 0.3,
        },
        opacity: {
            value: 0.003,
        },
        mixNextFrame: {
            value: 1,
        },
        COLUMN: {
            value: 8,
        },
        ROW: {
            value: 8,
        },
        scale: {
            value: new THREE.Vector3(1, 1, 1),
        },
    };

    smokeParticleMaterial = new THREE.ShaderMaterial({
        uniforms: particleUniforms,
        vertexShader: shaders[0].vertex,
        fragmentShader: shaders[0].smokeParticleFragment,
        depthTest: true,
        transparent: true,
    });

    smokeGeometries = [];

    for (let i = 0; i < 10; i += 1) {
        smokeGeometries.push(new THREE.PlaneGeometry(20, 20));
        smokeGeometries[i].rotateZ(Math.random() * 360);
        const smokeMesh = new THREE.Mesh(smokeGeometries[i], smokeParticleMaterial);
        velocities.push(new THREE.Vector2(rangedRandom(-0.01, 0.01), rangedRandom(0.08, 0.2)));
        smokeMesh.position.set(-25, rangedRandom(15, 10), 0);
        smokeParticlesWrapper.add(smokeMesh);
    }

    scene.add(smokeParticlesWrapper);

    // lifeTime = Math.round((64 / 60 / particleUniforms.speed.value) * 10);

    lifeTime = 200;

    particleOwnLifeTime = lifeTime;

    delay = 0.5;
};

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    particleOwnLifeTime -= 1;

    // previousTime = ((Math.round(time * 10) / 10) % 1) * 10;

    // const index = Number(previousTime.toFixed(1)) - 1;

    for (let i = 0; i < smokeParticlesWrapper.children.length; i += 1) {
        const object = smokeParticlesWrapper.children[i];

        if (particleOwnLifeTime === 0) {
            if (i === 0) {
                velocities = [];
            }
            smokeGeometries[i].rotateZ(Math.random() * 360);
            velocities.push(new THREE.Vector2(rangedRandom(-0.01, 0.01), rangedRandom(0.08, 0.2)));
            object.position.set(-25, rangedRandom(15, 10), 0);

            if (i === smokeParticlesWrapper.children.length - 1) {
                particleOwnLifeTime = lifeTime;
                particleUniforms.opacity.value = 0.0;
            }
        }
        object.translateX(velocities[i].x);
        object.translateY(velocities[i].y);
    }

    uniforms.time.value = time;
    particleUniforms.time.value = time;
    particleUniforms.opacity.value += 0.003;

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
