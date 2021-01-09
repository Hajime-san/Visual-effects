varying vec2 vUv;

uniform sampler2D colorBuffer;

void main() {

    vec4 color = texture2D( colorBuffer, vUv );

    gl_FragColor = color;
}
