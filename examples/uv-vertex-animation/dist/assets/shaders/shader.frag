#define SHIFT 0.5
#define OPACITY 2.0

varying vec2 vUv1;
varying vec2 vUv2;

uniform float time;
uniform float speed;
uniform sampler2D texture;

void main() {

    float velocity = fract(time * speed);

    vec4 tex1 = texture2D( texture, mix(vUv1, vUv2, velocity));

    vec4 tex2 = texture2D( texture, mix(vUv1, vUv2, fract(velocity + SHIFT)) );

    float blendAnimation = abs(velocity - SHIFT) * 2.0;

    vec3 baseAnimation = mix(tex1.xyz, tex2.xyz, blendAnimation);

    float alpha = mix(tex1.a, tex2.a, blendAnimation) * OPACITY;

    vec4 smokeColor = vec4(1.0,1.0,1.0,0.0);

    vec3 baseColor = baseAnimation * smokeColor.xyz;

    vec4 finalColor = vec4(baseColor, alpha);

    gl_FragColor = finalColor;
}
