#define COLUMN 8.0
#define ROW 8.0

varying vec2 vUv;

uniform sampler2D uTex;
uniform sampler2D uTex2;
uniform float time;

void main() {

    float frame = 16.0;

    float offsetX = (vUv.x + floor(time * frame)) / COLUMN;
    float offsetY = (vUv.y + floor(time * frame)) / COLUMN;

    vec4 color = texture2D( uTex, vec2(offsetX, offsetY) ).rgba;
    vec3 color2 = texture2D( uTex2, vec2(offsetX, offsetY) ).rgb;
    vec4 finalColor = vec4(color.rgb + color2, color.a);

    gl_FragColor = finalColor;
}
