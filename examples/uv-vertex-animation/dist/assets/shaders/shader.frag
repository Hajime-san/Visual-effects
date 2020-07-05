varying vec2 vUv;

uniform float time;
uniform float speed;

void main() {
    gl_FragColor = vec4(sin(time * 10.0),1.0,1.0,1.0);
}
