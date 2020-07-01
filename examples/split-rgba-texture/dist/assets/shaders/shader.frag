varying vec2 vUv;

uniform sampler2D loopAnimationTexture;
uniform float COLUMN;
uniform float ROW;
uniform float time;
uniform float speed;
uniform vec4 particleColor;
uniform vec3 dynamicParameter;

float saturate(float x) {
    return clamp( x, 0.0, 1.0 );
}

vec4 create_uv_loop (sampler2D tex) {
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
    vec4 texture = texture2D( tex, animatedUv );
    return texture;
}

void main() {

    vec4 baseColor = vec4(0.974, 0.102, 0.00482, 0.0);

    float depthFade = dynamicParameter.x;
    float intensity = dynamicParameter.y;
    float alphaCtrl = dynamicParameter.z;

    vec4 texture = create_uv_loop(loopAnimationTexture);
    vec4 multiplyColor = texture * particleColor;
    float addColor = (multiplyColor.r + multiplyColor.g) + (multiplyColor.b + multiplyColor.a);

    float removeMinus = max(addColor, 0.0);
    float setIntensity = removeMinus * intensity;

    vec3 finalBaseColor = baseColor.rgb * setIntensity;

    float modulateAlpha = saturate((addColor * addColor) + addColor);
    float finalAlpha = modulateAlpha * alphaCtrl;

    vec4 finalColor = vec4(finalBaseColor, finalAlpha);

    gl_FragColor = finalColor;
}
