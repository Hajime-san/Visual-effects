varying vec2 vUv;

uniform sampler2D colorPassTexture;

void main() {

    vec4 color = texture2D( colorPassTexture, vUv );

    gl_FragColor = color;
}
