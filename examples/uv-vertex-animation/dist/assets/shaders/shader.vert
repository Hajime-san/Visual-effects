varying vec2 vUv;
varying vec2 uv1;

uniform float time;
uniform float speed;
uniform vec3 scale;

vec2 lerp(vec2 x, vec2 y, float a) {
    return mix(x, y, fract(a));
}

void main() {

    /** billborad mesh with vertex shader
    * https://stackoverflow.com/questions/24259404/how-to-apply-custom-shader-to-sprite-in-three-js
    */

    vUv = uv;

    float t = fract(time * speed);

    //uv1 = lerp(vUv, vUv, t);

   // uv1 =

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}
