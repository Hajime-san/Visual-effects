import * as THREE from 'three';
import { loadShaders } from '../../../modules/Util';

type RenderTargetRelation = {
    renderTarget: THREE.WebGLRenderTarget;
    uniformKeyName: string;
    actualRenderTarget?: boolean;
};

type RenderPassContext = {
    actualRenderTarget: THREE.WebGLRenderTarget;
    renderTargetRelation: Array<RenderTargetRelation>;
    mesh: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
    renderPassName: string;
};

type RenderPassMap = Map<number, RenderPassContext>;

type RenderPassOptions = {
    renderTargetRelation: Array<RenderTargetRelation>;
    fragmentShader: string;
    uniforms?: { [uniform: string]: THREE.IUniform };
    vertexShader?: string;
};

/**
 *
 *
 * @export
 * @class RenderPassManager
 */
export class RenderPassManager {
    private renderer: THREE.WebGLRenderer;

    private baseScene: THREE.Scene;

    private baseCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

    private postScene: THREE.Scene;

    private postCamera: THREE.OrthographicCamera;

    private passPlaneGeometry: THREE.PlaneBufferGeometry;

    private renderPassPool: RenderPassMap;

    private passPlaneVertexShader: string;

    private renderPassCount: number;

    constructor(renderer: THREE.WebGLRenderer, baseScene: THREE.Scene, baseCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
        this.renderer = renderer;
        this.baseScene = baseScene;
        this.baseCamera = baseCamera;
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.passPlaneGeometry = new THREE.PlaneBufferGeometry(2, 2);
        this.renderPassPool = new Map();
        this.renderPassCount = 0;
    }

    /**
     *
     * Add render pass to RenderPassManager
     * @param {string} renderPassName
     * @param {Object} renderPassOptions.renderTargetRelation - you must set pare of RenderTarget and its uniform variable key
     * @memberof RenderPassManager
     */
    public async addRenderPass(renderPassName: string, renderPassOptions: RenderPassOptions) {
        if (typeof this.passPlaneVertexShader === 'undefined' && typeof renderPassOptions.vertexShader === 'undefined') {
            const shaderData = await loadShaders([{ key: 'planeVertex', path: './assets/shaders/plane.vert' }]);
            this.passPlaneVertexShader = shaderData.planeVertex;
        }

        let actualRenderTarget = null;

        for (let index = 0; index < renderPassOptions.renderTargetRelation.length; index += 1) {
            const item = renderPassOptions.renderTargetRelation[index];
            if (item.actualRenderTarget) {
                actualRenderTarget = item.renderTarget;
            }
        }

        const uniformObj: { [uniform: string]: THREE.IUniform } = {};

        const bufferUniforms = renderPassOptions.renderTargetRelation.map(value => {
            const key = value.uniformKeyName;
            uniformObj[key] = {
                value: null,
            };
            return uniformObj;
        })[0];

        const otherUniforms = renderPassOptions.uniforms ? renderPassOptions.uniforms : {};

        const mergedUniforms = Object.assign(bufferUniforms, otherUniforms);

        const material = new THREE.ShaderMaterial({
            vertexShader: renderPassOptions.vertexShader ? renderPassOptions.vertexShader : this.passPlaneVertexShader,
            fragmentShader: renderPassOptions.fragmentShader,
            uniforms: mergedUniforms,
        });

        const renderPass: RenderPassContext = {
            actualRenderTarget: actualRenderTarget,
            renderTargetRelation: renderPassOptions.renderTargetRelation,
            mesh: new THREE.Mesh(this.passPlaneGeometry, material),
            renderPassName: renderPassName,
        };

        renderPass.mesh.visible = false;

        this.postScene.add(renderPass.mesh);

        this.renderPassPool.set(this.renderPassCount, renderPass);

        this.renderPassCount += 1;
    }

    private animate() {
        this.renderPassPool.forEach((value, index) => {
            const lastRenderPassIndex = this.renderPassPool.size - 1;

            // render base scene
            if (index === 0) {
                this.renderer.setRenderTarget(value.actualRenderTarget);
                this.renderer.render(this.baseScene, this.baseCamera);
            }

            // render post processing scene
            if (index > 0) {
                this.renderer.setRenderTarget(value.actualRenderTarget);
                this.renderer.render(this.postScene, this.postCamera);
            }

            // hide result pass mesh
            if (index === 0) {
                const renderResultPassObject = this.renderPassPool.get(lastRenderPassIndex);
                renderResultPassObject.mesh.visible = false;
            }

            // hide previous pass mesh
            if (index > 0) {
                const previousRenderPassObject = this.renderPassPool.get(index - 1);
                previousRenderPassObject.mesh.visible = false;
            }

            // visible current pass mesh
            value.mesh.visible = true;

            // set buffer texture to uniform variable
            Object.values(value.renderTargetRelation).forEach(renderTargetRelation => {
                value.mesh.material.uniforms[renderTargetRelation.uniformKeyName].value = renderTargetRelation.renderTarget.texture;
            });

            // render final result
            if (index === lastRenderPassIndex) {
                this.renderer.setRenderTarget(null);
                this.renderer.render(this.postScene, this.postCamera);
            }
        });
    }

    public tick() {
        this.animate();

        requestAnimationFrame(() => this.tick());
    }

    public getMeshByRenderPassName(renderPassName: string) {
        let mesh: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial> | Error = null;

        this.renderPassPool.forEach(value => {
            if (value.renderPassName === renderPassName) {
                mesh = value.mesh;
            } else {
                mesh = new Error("can't find object.");
            }
        });

        return mesh;
    }
}
