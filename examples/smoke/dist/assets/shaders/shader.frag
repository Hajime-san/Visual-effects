varying vec2 vUv;

uniform sampler2D loopAnimationTexture;
uniform sampler2D baseColorTexture;
uniform float COLUMN;
uniform float ROW;
uniform float time;

void main() {

    float sumFlip = COLUMN * ROW;

    float currentIndex = floor(fract(time * 2.0) * sumFlip);

    vec2 flipSize = vec2( 1.0 / COLUMN, 1.0 / ROW);

    float col = mod(currentIndex, COLUMN);
    float row = floor(currentIndex / ROW);

    vec2 currentPosition = vec2(col, row);

    vec2 pattern = flipSize * vUv;

    vec2 normalizedPosition = flipSize * currentPosition;

    vec2 animatedUv = pattern + normalizedPosition;


    vec4 loopTex = texture2D( loopAnimationTexture, animatedUv ).rgba;
    vec4 baseColorTex = vec4( texture2D( baseColorTexture, animatedUv ).rgb, 1.0);
    float alphaChannel = loopTex.a;
    vec3 additiveBlendColor = loopTex.rgb + baseColorTex.rgb;
    vec4 finalColor = vec4(additiveBlendColor, alphaChannel);

    gl_FragColor = finalColor;
}
