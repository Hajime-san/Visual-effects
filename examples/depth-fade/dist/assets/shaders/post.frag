#include <packing>

varying vec2 vUv;
uniform sampler2D depthMap;
uniform float cameraNear;
uniform float cameraFar;


float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

void main() {
    float depth = readDepth( depthMap, vUv );

    gl_FragColor = vec4( vec3( depth ), 1.0);
}
