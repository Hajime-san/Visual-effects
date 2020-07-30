varying vec2 vUv;
varying vec3 vPosition;

uniform float time;
uniform sampler2D noiseTexture;

float thresHold = 0.5;
float edgeWidth = 0.2;
float strength = 2.0;

vec3 baseColor = vec3(1.0, 1.0, 1.0);
vec3 edgeColor = vec3(0.25, 0.55, 0.75);


void main() {

    float repeat = abs(fract(time * 0.5) * 2.0);

    float transitionDirection = 1.0 - vPosition.x;

    vec4 noiseMap = texture2D(noiseTexture, vUv) + transitionDirection * strength;

    float intensity = ((edgeWidth + 1.0) * (strength - thresHold)) * repeat;

    float disSolve = smoothstep(intensity - edgeWidth, intensity, noiseMap.r);

    vec4 finalColor = vec4(edgeColor * (1.0 - disSolve), disSolve);

    gl_FragColor = finalColor;
}
