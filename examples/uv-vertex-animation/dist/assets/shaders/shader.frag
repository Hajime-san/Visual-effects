#define SHIFT 0.5
#define OPACITY 2.0
varying vec2 vUv1;
varying vec2 vUv2;

uniform float time;
uniform float speed;
uniform sampler2D texture;

vec3 lerp3(vec3 x, vec3 y, float a) {
    return mix(x, y, fract(a));
}

vec2 lerp2(vec2 x, vec2 y, float a) {
    return mix(x, y, fract(a));
}

float lerp(float x, float y, float a) {
    return mix(x, y, fract(a));
}

void main() {

    float t = fract(time * speed);

    vec4 tex1 = texture2D( texture, lerp2(vUv1, vUv2, t));

    vec4 tex2 = texture2D( texture, lerp2(vUv1, vUv2, fract(t + SHIFT)) );

    float blendAnimation = abs(t - SHIFT) * 2.0;

    vec3 baseAnimation = lerp3(tex1.rgb, tex2.rgb, blendAnimation);

    float alpha = lerp(tex1.a, tex2.a, blendAnimation * OPACITY);

    vec4 smokeColor = vec4(1.0,1.0,1.0,0.0);

    vec3 baseColor = baseAnimation * smokeColor.rgb;

    vec4 finalColor = vec4(baseColor, alpha);

    gl_FragColor = finalColor;
}
