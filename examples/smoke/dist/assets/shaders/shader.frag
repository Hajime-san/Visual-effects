#define COLUMN 8.0
#define ROW 8.0

varying vec2 vUv;

uniform sampler2D loopAnimationTexture;
uniform sampler2D baseColorTexture;
uniform float time;

void main() {

    float currentIndex = floor(fract(time * 2.0) * COLUMN * ROW);

    vec2 size = vec2( 1.0 / COLUMN, 1.0 / ROW);

    float col = mod(currentIndex, COLUMN);
    float row = floor(currentIndex / ROW);

    vec2 uvPos = vec2(col, row);

    vec2 pattern = size * vUv;

    vec2 normalizedPos = size * uvPos;

    vec2 animatedUv = pattern + normalizedPos;


    vec4 color = texture2D( loopAnimationTexture, animatedUv ).rgba;
    vec3 color2 = texture2D( baseColorTexture, animatedUv ).rgb;
    vec4 finalColor = vec4(color.rgb + color2, color.a);

    gl_FragColor = finalColor;
}
