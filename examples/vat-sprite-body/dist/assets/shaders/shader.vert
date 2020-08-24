#define USE_NORMAL_MAP_VECTOR

varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;

attribute vec2 uv2;

uniform float time;
uniform float boudingBoxMax;
uniform float boundingBoxMin;
uniform float scaleMax;
uniform float scaleMin;
uniform float indicesLength;
uniform float currentFrame;
uniform float totalFrame;
uniform vec2 scale;
uniform sampler2D positionMap;
uniform sampler2D normalMap;

float frag = 1.0 / indicesLength;
float boundingBoxRange = boudingBoxMax + ( boundingBoxMin * - 1.0 );
float texShift = 0.5 * frag;
float scaleRange = scaleMax + ( scaleMin * - 1.0 );

void main() {
    // group id of child meshes for sampling texture's ultra
    float pu = uv2.x;
    float pv = 1.0 - fract( currentFrame / totalFrame ) + texShift;
    vec2 shiftUv = vec2( pu, pv );

    vec4 samplePosition = texture2D( positionMap, shiftUv );
    samplePosition *= boundingBoxRange;
    samplePosition += boundingBoxMin;

    vec4 outPosition = vec4( samplePosition.xyz , 1.0 );

    vec3 cameraFacing = vec3( 0.5 - uv.x, 1.0 - uv.y, 0.0 );
    cameraFacing *= vec3( 0.1, 0.1, 0.0 );
    vec3 finalPosition = cameraFacing + outPosition.xyz;
    finalPosition.xy *= scale;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) + vec4( finalPosition.xy, 0.0, 0.0);

    // vUv = uv;
    // vec4 mvPosition = modelViewMatrix * vec4( outPosition.xyz, 1.0 );
    // vViewPosition = - mvPosition.xyz;

    // #ifdef USE_NORMAL_MAP_VECTOR

    //     vec4 texelNormalPosition = texture2D( normalMap, shiftUv );
    //     texelNormalPosition *= boundingBoxRange;
    //     texelNormalPosition += boundingBoxMin;
    //     vNormal = normalMatrix * texelNormalPosition.xyz;

    // #else
    //     // Quality isn't high enough(work in progress)
    //     vec3 decodedNormal = VAT_UnpackAlpha( samplePosition.a );
    //     vNormal = normalMatrix * decodedNormal;

    // #endif
}
