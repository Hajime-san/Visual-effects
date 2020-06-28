import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {rangedRandom, loadShaders, ShaderData, labelMaterial} from './Util';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let planeGeometry: THREE.PlaneGeometry;
let shaderMaterial: THREE.ShaderMaterial;
let singleSmoke: THREE.Mesh;
let smokeGeometries: Array<THREE.PlaneGeometry>;
let smokeParticleMaterial: THREE.ShaderMaterial;
let textureLoader: THREE.TextureLoader;
let uniforms: any;
let time: number;
let delta: THREE.Clock;
let shaderData: ShaderData;
let loopAnimationTexture: THREE.Texture;
let baseColorTexture: THREE.Texture;

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

const init = async () => {
    // intial settings
    const container = document.getElementById('canvas');
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 10, 40);

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

    loopAnimationTexture = textureLoader.load('./assets/images/T_Smoke_SubUV.png');
    baseColorTexture = textureLoader.load('./assets/images/T_Smoke_Tiled_D.jpg');

    // set uniform variables
    uniforms = {
        loopAnimationTexture: {value: loopAnimationTexture},
        baseColorTexture: {value: baseColorTexture},
        time: {
            value: 0.0,
        },
        speed: {
            value: 0.5,
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
    shaderData = await loadShaders([
        {key: 'vertex', path: './assets/shaders/shader.vert'},
        {key: 'singleFrame', path: './assets/shaders/singleFrame.frag'},
        {key: 'mixtwoFrame', path: './assets/shaders/mixTwoFrameShader.frag'},
        {key: 'smokeParticleFragment', path: './assets/shaders/smokeParticles.frag'},
    ]);

    shaderMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaderData.vertex,
        fragmentShader: shaderData.mixtwoFrame,
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

    shaderMaterial.fragmentShader = shaderData.singleFrame;

    const noMixFrameParticles = new THREE.Mesh(nonMixFrameGeometry, shaderMaterial);

    noMixFrameParticles.position.set(25, 10, 0);

    scene.add(noMixFrameParticles);

    const spriteSingleFrameText = new THREE.Sprite(labelMaterial('single frame'));
    spriteSingleFrameText.position.set(25, 25, 0);
    spriteSingleFrameText.scale.set(10, 10, 10);

    scene.add(spriteSingleFrameText);

    // multiple particles

    smokeGeometries = [];
};

let delay = 0;

const smokeMesh: any = {};

let staticLifeTime = 0;

const animate = () => {
    requestAnimationFrame(animate);

    const frame = delta.getDelta();

    time += frame;

    delay += 1;

    if (delay % 10 === 0 && Object.keys(smokeMesh).length < 20) {
        delay = 0;

        const geom = new THREE.PlaneGeometry(20, 20);
        smokeGeometries.push(geom);
        geom.rotateZ(Math.random() * 360);

        const particleUniforms = {
            loopAnimationTexture: {value: loopAnimationTexture},
            baseColorTexture: {value: baseColorTexture},
            time: {
                value: 0,
            },
            speed: {
                value: 0.3,
            },
            opacity: {
                value: 0.003,
            },
            resetOpacity: {
                value: false,
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
            vertexShader: shaderData.vertex,
            fragmentShader: shaderData.smokeParticleFragment,
            depthTest: true,
            transparent: true,
        });

        smokeMesh[geom.uuid] = new THREE.Mesh(geom, smokeParticleMaterial);

        staticLifeTime = Math.floor(
            (smokeParticleMaterial.uniforms.COLUMN.value * smokeParticleMaterial.uniforms.ROW.value) /
                smokeParticleMaterial.uniforms.speed.value
        );

        smokeMesh[geom.uuid].userData = {
            velocity: new THREE.Vector2(rangedRandom(-0.01, 0.01), rangedRandom(0.08, 0.2)),
            lifeTime: staticLifeTime,
            lifeCycleTime: -time,
        };
        smokeMesh[geom.uuid].position.set(-25, rangedRandom(12, 8), 0);
        scene.add(smokeMesh[geom.uuid]);
    }

    if (Object.keys(smokeMesh).length !== 0) {
        Object.keys(smokeMesh).forEach(key => {
            if (smokeMesh[key].userData.lifeTime === 0) {
                smokeMesh[key].material.uniforms.resetOpacity.value = true;
                smokeMesh[key].material.uniforms.opacity.value = 0;

                smokeMesh[key].userData = {
                    velocity: new THREE.Vector2(rangedRandom(-0.01, 0.01), rangedRandom(0.08, 0.2)),
                    lifeTime: staticLifeTime,
                    lifeCycleTime: -time,
                };
                smokeMesh[key].position.set(-25, rangedRandom(12, 8), 0);
            }
            smokeMesh[key].material.uniforms.resetOpacity.value = false;
            smokeMesh[key].userData.lifeTime -= 1;
            smokeMesh[key].translateX(smokeMesh[key].userData.velocity.x);
            smokeMesh[key].translateY(smokeMesh[key].userData.velocity.y);
            smokeMesh[key].material.uniforms.opacity.value += 0.003;
            smokeMesh[key].material.uniforms.time.value = smokeMesh[key].userData.lifeCycleTime + time;
        });
    }

    uniforms.time.value = time;

    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    animate();
});
