varying vec2 vUv;

uniform sampler2D colorBuffer;
uniform vec3 deviation[15];

void main() {

    vec4 result;

    for(int i = 0; i < 15; ++i) {
        result += texture2D( colorBuffer, vUv + deviation[i].xy ) * vec4( deviation[i].z );
    }

    gl_FragColor = result;
}
