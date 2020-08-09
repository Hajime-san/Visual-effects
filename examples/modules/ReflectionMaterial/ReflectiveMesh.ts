/**
 * based on
 * https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Reflector.js
 */

import * as THREE from 'three';
import { loadShaders, ShaderData, loadTexture } from '../Util';

type ReflectiveMeshParameters = {
    textureWidth?: number;
    textureHeight?: number;
    clipBias?: number;
    encoding?: THREE.TextureEncoding;
    roughness?: number;
    metalness?: number;
    color?: THREE.Color;
    mapPath?: string;
    normalMapPath?: string;
    roughnessMapPath?: string;
};

export class ReflectiveMesh extends THREE.Mesh<THREE.BufferGeometry | THREE.Geometry, THREE.ShaderMaterial> {
    private textureWidth: number;

    private textureHeight: number;

    private clipBias: number;

    private encoding: THREE.TextureEncoding;

    private roughness: number;

    private metalness: number;

    private color: THREE.Color;

    private map: THREE.Texture;

    private normalMap: THREE.Texture;

    private roughnessMap: THREE.Texture;

    private shaderData: ShaderData;

    private uniforms: { [uniform: string]: THREE.IUniform };

    constructor(geometry: THREE.Geometry, options: ReflectiveMeshParameters) {
        super(geometry);

        this.textureWidth = options.textureWidth || 512;
        this.textureHeight = options.textureHeight || 512;
        this.clipBias = options.clipBias || 0;
        this.encoding = options.encoding !== undefined ? options.encoding : THREE.LinearEncoding;
        this.roughness = options.roughness !== undefined ? options.roughness : 0.5;
        this.metalness = options.metalness !== undefined ? options.metalness : 0.5;
        this.color = options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(0x7f7f7f);
        this.map = options.mapPath !== undefined ? this.map : null;
        this.normalMap = options.normalMapPath !== undefined ? this.normalMap : null;
        this.roughnessMap = options.roughnessMapPath !== undefined ? this.roughnessMap : null;

        this.init();
    }

    private init() {
        const reflectorPlane = new THREE.Plane();
        const normal = new THREE.Vector3();
        const reflectorWorldPosition = new THREE.Vector3();
        const cameraWorldPosition = new THREE.Vector3();
        const rotationMatrix = new THREE.Matrix4();
        const lookAtPosition = new THREE.Vector3(0, 0, -1);
        const clipPlane = new THREE.Vector4();

        const view = new THREE.Vector3();
        const target = new THREE.Vector3();
        const q = new THREE.Vector4();

        const textureMatrix = new THREE.Matrix4();
        const virtualCamera = new THREE.PerspectiveCamera();

        const parameters = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            stencilBuffer: false,
            encoding: this.encoding,
        };

        const renderTarget = new THREE.WebGLRenderTarget(this.textureWidth, this.textureHeight, parameters);

        if (!THREE.MathUtils.isPowerOfTwo(this.textureWidth) || !THREE.MathUtils.isPowerOfTwo(this.textureHeight)) {
            renderTarget.texture.generateMipmaps = false;
        }

        this.uniforms = {
            color: {
                value: null,
            },

            reflectionTexture: {
                value: null,
            },

            roughness: {
                value: 0,
            },

            metalness: {
                value: 0,
            },

            textureMatrix: {
                value: null,
            },

            map: {
                value: null,
            },

            normalMap: {
                value: null,
            },

            roughnessMap: {
                value: null,
            },

            ...THREE.UniformsLib.lights,
            ...THREE.ShaderLib.physical.uniforms,
        };

        this.material = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(this.uniforms),
            vertexShader: this.shaderData.vertex,
            fragmentShader: this.shaderData.fragment,
            lights: true,
            extensions: {
                derivatives: true,
            },
        });

        this.material.uniforms.reflectionTexture.value = renderTarget.texture;
        this.material.uniforms.textureMatrix.value = textureMatrix;

        // shading
        this.material.uniforms.roughness.value = this.roughness;
        this.material.uniforms.metalness.value = this.metalness;

        this.material.uniforms.color.value = this.color;

        // textures
        this.material.uniforms.map.value = this.map;
        this.material.uniforms.normalMap.value = this.normalMap;
        this.material.uniforms.roughnessMap.value = this.roughnessMap;

        this.onBeforeRender = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
            reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld);
            cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

            rotationMatrix.extractRotation(this.matrixWorld);

            normal.set(0, 0, 1);
            normal.applyMatrix4(rotationMatrix);

            view.subVectors(reflectorWorldPosition, cameraWorldPosition);

            // Avoid rendering when reflector is facing away

            if (view.dot(normal) > 0) return;

            view.reflect(normal).negate();
            view.add(reflectorWorldPosition);

            rotationMatrix.extractRotation(camera.matrixWorld);

            lookAtPosition.set(0, 0, -1);
            lookAtPosition.applyMatrix4(rotationMatrix);
            lookAtPosition.add(cameraWorldPosition);

            target.subVectors(reflectorWorldPosition, lookAtPosition);
            target.reflect(normal).negate();
            target.add(reflectorWorldPosition);

            virtualCamera.position.copy(view);
            virtualCamera.up.set(0, 1, 0);
            virtualCamera.up.applyMatrix4(rotationMatrix);
            virtualCamera.up.reflect(normal);
            virtualCamera.lookAt(target);

            virtualCamera.far = camera.far; // Used in WebGLBackground

            virtualCamera.updateMatrixWorld();
            virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

            // Update the texture matrix
            textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
            textureMatrix.multiply(virtualCamera.projectionMatrix);
            textureMatrix.multiply(virtualCamera.matrixWorldInverse);
            textureMatrix.multiply(this.matrixWorld);

            // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
            // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
            reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
            reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);

            clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant);

            const projectionMatrix = virtualCamera.projectionMatrix;

            q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
            q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
            q.z = -1.0;
            q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

            // Calculate the scaled plane vector
            clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

            // Replacing the third row of the projection matrix
            projectionMatrix.elements[2] = clipPlane.x;
            projectionMatrix.elements[6] = clipPlane.y;
            projectionMatrix.elements[10] = clipPlane.z + 1.0 - this.clipBias;
            projectionMatrix.elements[14] = clipPlane.w;

            // Render

            this.visible = false;

            const currentRenderTarget = renderer.getRenderTarget();

            const currentXrEnabled = renderer.xr.enabled;
            const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

            renderer.xr.enabled = false; // Avoid camera modification
            renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

            renderer.setRenderTarget(renderTarget);

            renderer.state.buffers.depth.setMask(true); // make sure the depth buffer is writable so it can be properly cleared, see #18897

            if (renderer.autoClear === false) renderer.clear();
            renderer.render(scene, virtualCamera);

            renderer.xr.enabled = currentXrEnabled;
            renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

            renderer.setRenderTarget(currentRenderTarget);

            // Restore viewport

            // const viewport = camera.viewport;

            // if (viewport !== undefined) {
            //     renderer.state.viewport(viewport);
            // }

            this.visible = true;
        };
    }

    static async new(geometry: THREE.Geometry, options: ReflectiveMeshParameters) {
        if (typeof options.mapPath === 'string') {
            this.prototype.map = await loadTexture(options.mapPath);
        }
        if (typeof options.normalMapPath === 'string') {
            this.prototype.normalMap = await loadTexture(options.normalMapPath);
        }
        if (typeof options.roughnessMapPath === 'string') {
            this.prototype.roughnessMap = await loadTexture(options.roughnessMapPath);
        }

        // set Promise property initial
        this.prototype.shaderData = await loadShaders([
            { key: 'vertex', path: './assets/shaders/mapShader.vert' },
            { key: 'fragment', path: './assets/shaders/mapShader.frag' },
        ]);

        const self = new ReflectiveMesh(geometry, options);

        return self;
    }
}
