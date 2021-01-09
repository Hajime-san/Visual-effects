import * as THREE from 'three';
import { loadShaders } from '../../../modules/Util';

type RenderPassContext = {
    renderTarget: THREE.WebGLRenderTarget;
    mesh: THREE.Mesh<THREE.PlaneBufferGeometry, THREE.ShaderMaterial>;
    renderPassName: string;
};

type RenderPassMap = Map<number, RenderPassContext>;

type RenderPassOptions = {
    renderTarget: THREE.WebGLRenderTarget;
    uniforms: { [uniform: string]: THREE.IUniform };
    fragmentShader: string;
    vertexShader?: string;
};

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

    private renderTargets: Map<string, THREE.WebGLRenderTarget>;

    constructor(renderer: THREE.WebGLRenderer, baseScene: THREE.Scene, baseCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
        this.renderer = renderer;
        this.baseScene = baseScene;
        this.baseCamera = baseCamera;
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.passPlaneGeometry = new THREE.PlaneBufferGeometry(2, 2);
        this.renderPassPool = new Map();
        this.renderPassCount = 0;
        this.renderTargets = new Map();
    }

    public async createRenderPass(renderPassName: string, renderPassOptions: RenderPassOptions) {
        if (typeof renderPassOptions.vertexShader === 'undefined' && typeof this.passPlaneVertexShader === 'undefined') {
            const shaderData = await loadShaders([{ key: 'planeVertex', path: './assets/shaders/plane.vert' }]);
            this.passPlaneVertexShader = shaderData.planeVertex;
        }

        const material = new THREE.ShaderMaterial({
            vertexShader: renderPassOptions.vertexShader ? renderPassOptions.vertexShader : this.passPlaneVertexShader,
            fragmentShader: renderPassOptions.fragmentShader,
            uniforms: renderPassOptions.uniforms,
        });

        const renderPass: RenderPassContext = {
            renderTarget: renderPassOptions.renderTarget,
            mesh: new THREE.Mesh(this.passPlaneGeometry, material),
            renderPassName: renderPassName,
        };

        renderPass.mesh.visible = false;

        this.postScene.add(renderPass.mesh);

        this.renderPassPool.set(this.renderPassCount, renderPass);

        this.renderPassCount += 1;

        this.renderTargets.set(renderPassName, renderPassOptions.renderTarget);
    }

    private animate() {
        this.renderPassPool.forEach((value, key) => {
            // render base scene
            if (key === 0) {
                this.renderer.setRenderTarget(value.renderTarget);
                this.renderer.render(this.baseScene, this.baseCamera);
            }

            // render post processing scene
            if (key > 0) {
                this.renderer.setRenderTarget(value.renderTarget);
                this.renderer.render(this.postScene, this.postCamera);
            }

            // hide result pass mesh
            if (key === 0) {
                const renderResultPassObject = this.renderPassPool.get(this.renderPassPool.size - 1);
                renderResultPassObject.mesh.visible = false;
            }

            // hide previous pass mesh
            if (key > 0) {
                const previousRenderPassObject = this.renderPassPool.get(key - 1);
                previousRenderPassObject.mesh.visible = false;
            }

            // visible current pass mesh
            value.mesh.visible = true;

            let bufferCount = 0;

            // set buffer texture to uniform variable
            Object.keys(value.mesh.material.uniforms).forEach(uniformKey => {
                if (uniformKey.match(/Buffer/)) {
                    if (bufferCount > 0) {
                        const pass = this.renderTargets.get(uniformKey);

                        value.mesh.material.uniforms[uniformKey].value = pass.texture;
                    } else {
                        value.mesh.material.uniforms[uniformKey].value = value.renderTarget.texture;
                    }

                    bufferCount += 1;
                }
            });

            // render final result
            if (key === this.renderPassPool.size - 1) {
                this.renderer.setRenderTarget(null);
                this.renderer.render(this.postScene, this.postCamera);
            }
        });
    }

    public tick() {
        this.animate();

        requestAnimationFrame(() => this.tick());
    }
}
