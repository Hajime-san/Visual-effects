#define USE_MAP true

varying vec2 vUv;

uniform float time;
uniform float speed;
uniform sampler2D map;

vec2 lerp(vec2 x, vec2 y, float a) {
    return mix(x, y, fract(a));
}

void main() {

    float t = fract(time * speed);

    vec2 tex1 = lerp(vUv, vUv, t);

    // float c = fract(t + 0.5);

    // float tex2 = lerp(vUv, vUv, c);

    // float alpha = abs(t - 0.5);

   // uv1 =
    vec4 baseColor = vec4(1.0,1.0,1.0,0.0);
    vec3 color1 = vec3(vUv, 0.0);
    vec3 finalColor = color1 * baseColor.rgb;


    vec4 tex = texture2D( map, vUv );

    gl_FragColor = tex;
}
