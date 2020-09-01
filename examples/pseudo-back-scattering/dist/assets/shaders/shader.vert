attribute vec2 uv2;

varying vec2 vUv1;
varying vec2 vUv2;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vPosition;


void main() {

    vUv1 = uv;
    vUv2 = uv2;

    vPosition = position;

    vNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = mvPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}
