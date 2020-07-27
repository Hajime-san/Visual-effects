varying vec2 vUv;

uniform float time;
uniform sampler2D noiseTexture;

float thresHold = 0.5;
float edgeWidth = 0.3;


void main() {

    float repeat = abs(fract(time * 0.5) * 2.0);

    vec4 noiseMap = texture2D(noiseTexture, vUv);

    float intensity = ((edgeWidth + 1.0) * (1.0 - thresHold)) * repeat;

    float mixed = smoothstep(intensity - edgeWidth, intensity, noiseMap.r);

    vec4 baseColor = vec4(1.0, 1.0, 1.0, mixed);

    gl_FragColor = baseColor;
}
