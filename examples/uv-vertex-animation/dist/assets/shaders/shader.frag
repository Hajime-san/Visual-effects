varying vec2 vUv;
varying vec2 uv1;

uniform float time;
uniform float speed;

void main() {
    vec4 baseColor = vec4(1.0,1.0,1.0,0.0);
    vec3 color1 = vec3(uv1, 0.0);
    vec3 finalColor = color1 * baseColor.rgb;
    gl_FragColor = vec4(finalColor, 1.0);
}
