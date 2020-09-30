#include <packing>

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;


float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}


float LinearizeDepth( sampler2D depthSampler, vec2 uv) {
  float n = 1.0; // camera z near
  float f = 100.0; // camera z far
  float z = texture2D(depthSampler, uv).x;
  return (2.0 * n) / (f + n - z * (f - n));
}

float saturate(float a) {
    return clamp(a, 0.0, 1.0);
}

void main() {
    vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
    float depth = LinearizeDepth( tDepth, vUv );

    gl_FragColor.rgb = 1.0 - vec3( depth );
    gl_FragColor.a = 1.0;
}
