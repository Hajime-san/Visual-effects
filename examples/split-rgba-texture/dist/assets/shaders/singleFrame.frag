varying vec2 vUv;

uniform sampler2D loopAnimationTexture;
uniform float COLUMN;
uniform float ROW;
uniform float time;
uniform float speed;

void main() {

    float sumFlip = COLUMN * ROW;

    float velocity = sumFlip * fract(time * speed);

    vec2 flipSize = vec2( 1.0 / COLUMN, 1.0 / ROW);

    float currentIndex = floor(velocity);

    float currentColumn = mod(currentIndex, COLUMN);
    // origin coordinate from up left
    float currentRow = (ROW - 1.0) - floor(currentIndex / ROW);

    vec2 currentPosition = vec2(currentColumn, currentRow);

    vec2 pattern = flipSize * vUv;

    vec2 normalizedPosition = flipSize * currentPosition;

    vec2 animatedUv = normalizedPosition + pattern;


    vec4 loopTex = texture2D( loopAnimationTexture, animatedUv ).rgba;
    float alphaChannel = loopTex.a;
    vec3 currentFrameColor = loopTex.rgb;

    vec4 finalColor = vec4(currentFrameColor, alphaChannel);

    gl_FragColor = finalColor;
}
