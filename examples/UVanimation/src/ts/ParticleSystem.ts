import * as THREE from 'three';
import {rangedRandom, ShaderData} from './Util';

// geometry pool array
const geometries: Array<THREE.PlaneGeometry> = [];
// mesh pool arrayLike object
const mesh: {[prop: string]: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>} = {};
// keep current counter in requestAnimationFrame
let counter = 0;
// keep amount life time when it resets
let staticLifeTime = 0;

/**
 *
 * @param scene THREE.Scene
 * @param shaderData load same shader in main app
 * @param loopAnimationTexture load same texture in main app
 * @param baseColorTexture load same texture in main app
 * @param delay spawn each particle's delay frame in requestAnimationFrame
 * @param particleAmount amount of particle
 * @param speed play particle's animation speed
 * @param time passed time for update fragment shader
 */
export const init = (
    scene: THREE.Scene,
    shaderData: ShaderData,
    loopAnimationTexture: THREE.Texture,
    baseColorTexture: THREE.Texture,
    delay: number,
    particleAmount: number,
    speed: number,
    time: number
) => {
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

        const material = new THREE.ShaderMaterial({
            uniforms: particleUniforms,
            vertexShader: shaderData.vertex,
            fragmentShader: shaderData.smokeParticleFragment,
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
    if (Object.keys(mesh).length >= 0) {
        Object.keys(mesh).forEach(key => {
            // reset data when particle lifetime run out
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

            // update particle data
            mesh[key].material.uniforms.resetOpacity.value = false;
            mesh[key].userData.lifeTime -= 1;
            mesh[key].translateX(mesh[key].userData.velocity.x);
            mesh[key].translateY(mesh[key].userData.velocity.y);
            mesh[key].material.uniforms.opacity.value += 0.003;
            mesh[key].material.uniforms.time.value = mesh[key].userData.lifeCycleTime + time;
        });
    }
};
