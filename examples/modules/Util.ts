import * as THREE from 'three';

// text sprite
export const labelMaterial = (text: string) => {
    const canvas = document.createElement('canvas');

    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontSize = 36;

    ctx.fillStyle = '#000';
    ctx.font = `${fontSize}pt Georgia`;

    const textWidth = Math.floor(Number(ctx.measureText(text).width));

    const horizontalCenter = canvas.width / 2 - textWidth / 2;

    const verticalCenter = canvas.height / 2 + fontSize / 2;

    ctx.fillText(text, horizontalCenter, verticalCenter);

    const map = new THREE.CanvasTexture(canvas);

    return new THREE.SpriteMaterial({ map });
};

interface ShaderObject {
    key: string;
    path: string;
}

export interface ShaderData {
    [prop: string]: string;
}

export const loadShaders = async (shaderObject: Array<ShaderObject>) => {
    const result = await Promise.all(
        shaderObject.map(async v => {
            const shader = {
                [v.key]: await fetch(v.path).then(res => res.text()),
            };

            return shader;
        })
    );

    const shaderData: ShaderData = {};

    result.forEach(v => {
        shaderData[Object.keys(v)[0]] = Object.values(v)[0];
    });

    return shaderData;
};

export const onWindowResize = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

export const rangedRandom = (max: number, min: number) => {
    return Math.random() * (max - min) + min;
};
