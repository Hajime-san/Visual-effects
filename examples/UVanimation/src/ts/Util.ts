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
    // ctx.textAlign = 'center';

    const textWidth = Math.floor(Number(ctx.measureText(text).width));

    const horizontalCenter = canvas.width / 2 - textWidth / 2;

    const verticalCenter = canvas.height / 2 + fontSize / 2;

    ctx.fillText(text, horizontalCenter, verticalCenter);

    const map = new THREE.CanvasTexture(canvas);

    return new THREE.SpriteMaterial({ map });
};

interface ShaderObject {
  key: string,
  path: string
}

const loadShaders = async (shaderObject: Array<ShaderObject>) => {
  const vertexShader = await fetch('./assets/shaders/shader.vert').then(res => res.text());

  for (let index = 0; index < shaderObject.length; index+= 1) {
    const element = shaderObject[index];

  }

  return Promise.all([
      {
          vertex: vertexShader,
          singleFrame: singleFrameShader,
          mixtwoFrame: mixTwoFrameTwoFrameShader,
          smokeParticleFragment: smokeParticleFrag,
      },
  ]);
};

export const rangedRandom = (max: number, min: number) => {
    return Math.random() * (max - min) + min;
};
