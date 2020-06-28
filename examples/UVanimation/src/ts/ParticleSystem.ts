import * as THREE from 'three';
import {rangedRandom, loadShaders} from './Util';

let scene: THREE.Scene;
const geometries = [];
let material: THREE.ShaderMaterial;
const textureLoader = new THREE.TextureLoader();
let uniforms: any;
let delta: THREE.Clock;
let shaderData: {[prop: string]: string}[];
const loopAnimationTexture = textureLoader.load('./assets/images/T_Smoke_SubUV.png');
const baseColorTexture = textureLoader.load('./assets/images/T_Smoke_Tiled_D.jpg');
const mesh: any = {};
let counter = 0;
let staticLifeTime = 0;

export const init = (delay: number, particleAmount: number, speed: number, time: number) => {
    counter += 1;

    if (counter % delay === 0 && Object.keys(mesh).length <= particleAmount) {
        counter = 0;

        const geometory = new THREE.PlaneGeometry(20, 20);
        geometries.push(geometory);
        geometory.rotateZ(Math.random() * 360);

        const particleUniforms = {
            loopAnimationTexture: {value: loopAnimationTexture},
            baseColorTexture: {value: baseColorTexture},
            time: {
                value: 0,
            },
            speed: {
                value: speed,
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
        material = new THREE.ShaderMaterial({
            uniforms: particleUniforms,
            vertexShader: shaderData[0].vertex,
            fragmentShader: shaderData[0].smokeParticleFragment,
            depthTest: true,
            transparent: true,
        });

        mesh[geometory.uuid] = new THREE.Mesh(geometory, material);

        staticLifeTime = Math.floor(
            (material.uniforms.COLUMN.value * material.uniforms.ROW.value) / material.uniforms.speed.value
        );

        mesh[geometory.uuid].userData = {
            velocity: new THREE.Vector2(rangedRandom(-0.01, 0.01), rangedRandom(0.08, 0.2)),
            lifeTime: staticLifeTime,
            lifeCycleTime: -time,
        };
        mesh[geometory.uuid].position.set(-25, rangedRandom(12, 8), 0);
        scene.add(mesh[geometory.uuid]);
    }
};

export const update = (time: number) => {
    if (Object.keys(mesh).length !== 0) {
        Object.keys(mesh).forEach(key => {
            if (mesh[key].userData.lifeTime === 0) {
                mesh[key].material.uniforms.resetOpacity.value = true;
                mesh[key].material.uniforms.opacity.value = 0;

                mesh[key].userData = {
                    velocity: new THREE.Vector2(rangedRandom(-0.01, 0.01), rangedRandom(0.08, 0.2)),
                    lifeTime: staticLifeTime,
                    lifeCycleTime: -time,
                };
                mesh[key].position.set(-25, rangedRandom(12, 8), 0);
            }
            mesh[key].material.uniforms.resetOpacity.value = false;
            mesh[key].userData.lifeTime -= 1;
            mesh[key].translateX(mesh[key].userData.velocity.x);
            mesh[key].translateY(mesh[key].userData.velocity.y);
            mesh[key].material.uniforms.opacity.value += 0.003;
            mesh[key].material.uniforms.time.value = mesh[key].userData.lifeCycleTime + time;
        });
    }
};
