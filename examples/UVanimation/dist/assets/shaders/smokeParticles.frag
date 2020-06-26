varying vec2 vUv;

uniform sampler2D loopAnimationTexture;
uniform sampler2D baseColorTexture;
uniform float COLUMN;
uniform float ROW;
uniform float time;
uniform float speed;
uniform float opacity;
uniform bool mixNextFrame;
uniform bool resetOpacity;

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
    vec4 baseColorTex = vec4( texture2D( baseColorTexture, animatedUv ).rgb, 1.0);
    float alphaChannel = loopTex.a - opacity;

    if(resetOpacity == false) {
        alphaChannel = loopTex.a;
    }

    vec3 currentFrameColor = loopTex.rgb + baseColorTex.rgb;

    vec4 finalColor;
    if(mixNextFrame == true) {
        // create next flip
        float nextIndex = mod(currentIndex + 1.0, sumFlip);
        float nextColumn = mod(nextIndex, COLUMN);
        float nextRow = floor(nextIndex / ROW);
        vec2 nextPosition = vec2(nextColumn, nextRow);
        vec2 nextNormalizedPosition = flipSize * nextPosition;
        vec2 nextAnimatedUv = pattern + nextNormalizedPosition;

        vec4 nextLoopTex = texture2D( loopAnimationTexture, nextAnimatedUv ).rgba;
        vec4 nextBaseColorTex = vec4( texture2D( baseColorTexture, nextAnimatedUv ).rgb, 1.0);
        vec3 nextFrameColor = nextLoopTex.rgb + nextBaseColorTex.rgb;
        vec3 lerpFlipColor = mix(currentFrameColor, nextFrameColor, fract(velocity));

        finalColor = vec4(lerpFlipColor, alphaChannel);
    } else {

        finalColor = vec4(currentFrameColor, alphaChannel);
    }

    gl_FragColor = finalColor;
}
