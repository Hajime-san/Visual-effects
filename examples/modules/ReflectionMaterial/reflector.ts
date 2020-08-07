/**
 * based on
 * https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Reflector.js
 */

import * as THREE from 'three';
import { loadShaders, ShaderData, loadTexture } from '../Util';

type ReflectiveMeshParameters = {
    color?: THREE.Color;
    textureWidth?: number;
    textureHeight?: number;
    clipBias?: number;
    encoding?: THREE.TextureEncoding;
    colorTexturePath?: string;
    normalTexturePath?: string;
};

export class ReflectiveMesh extends THREE.Mesh {
    private color: THREE.Color;

    private textureWidth: number;

    private textureHeight: number;

    private clipBias: number;

    private encoding: THREE.TextureEncoding;

    private colorTexture: THREE.Texture;

    private normalTexture: THREE.Texture;

    private shaderData: ShaderData;

    private uniforms: { [uniform: string]: THREE.IUniform };

    constructor(geometry: THREE.Geometry, options: ReflectiveMeshParameters) {
        super(geometry);

        this.color = options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(0x7f7f7f);
        this.textureWidth = options.textureWidth || 512;
        this.textureHeight = options.textureHeight || 512;
        this.clipBias = options.clipBias || 0;
        this.encoding = options.encoding !== undefined ? options.encoding : THREE.LinearEncoding;
        this.colorTexture = options.colorTexturePath !== undefined ? this.colorTexture : null;
        this.normalTexture = options.normalTexturePath !== undefined ? this.normalTexture : null;

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

            tDiffuse: {
                value: null,
            },

            textureMatrix: {
                value: null,
            },

            colorTexture: {
                value: null,
            },

            normalTexture: {
                value: null,
            },

            ...THREE.UniformsLib.lights,
        };

        this.material = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(this.uniforms),
            vertexShader: this.shaderData.vertex,
            fragmentShader: this.shaderData.fragment,
            lights: true,
        });

        this.material.uniforms.tDiffuse.value = renderTarget.texture;
        this.material.uniforms.color.value = this.color;
        this.material.uniforms.textureMatrix.value = textureMatrix;

        // textures(optional)
        this.material.uniforms.colorTexture.value = this.colorTexture;
        this.material.uniforms.normalTexture.value = this.normalTexture;

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
        if (typeof options.colorTexturePath === 'string') {
            this.prototype.colorTexture = await loadTexture(options.colorTexturePath);
        }
        if (typeof options.normalTexturePath === 'string') {
            this.prototype.normalTexture = await loadTexture(options.normalTexturePath);
        }

        // set Promise property initial
        this.prototype.shaderData = await loadShaders([
            { key: 'vertex', path: './assets/_shaders/mapShader.vert' },
            { key: 'fragment', path: './assets/_shaders/mapShader.frag' },
        ]);

        const self = new ReflectiveMesh(geometry, options);

        return self;
    }
}
