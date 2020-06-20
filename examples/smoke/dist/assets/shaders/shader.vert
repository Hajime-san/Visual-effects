varying vec2 vUv;

uniform float uFixAspect;
uniform sampler2D uTex;
uniform sampler2D uTex2;

void main() {
    vUv = uv - .5;
    vUv.y *= uFixAspect;
    vUv += .5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position , 1.0);
}
