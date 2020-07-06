varying vec2 vUv;

void main() {

    /** billborad mesh with vertex shader
    * https://stackoverflow.com/questions/24259404/how-to-apply-custom-shader-to-sprite-in-three-js
    */

    vUv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}
