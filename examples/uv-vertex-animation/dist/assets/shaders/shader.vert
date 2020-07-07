attribute vec2 uv2;

varying vec2 vUv1;
varying vec2 vUv2;

void main() {

    /** billborad mesh with vertex shader
    * https://stackoverflow.com/questions/24259404/how-to-apply-custom-shader-to-sprite-in-three-js
    */

    vUv1 = uv;
    vUv2 = uv2;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}
