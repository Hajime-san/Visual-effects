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
uniform vec3 scale;
uniform sampler2D positionMap;
uniform sampler2D normalMap;

float frag = 1.0 / indicesLength;
float boundingBoxRange = boudingBoxMax + ( boundingBoxMin * - 1.0 );
float texShift = 0.5 * frag;
float scaleRange = scaleMax + ( scaleMin * - 1.0 );

vec3 VAT_UnpackAlpha(float a) {
    float a_hi = floor( a * 32.0 );
    float a_lo = a * 32.0 * 32.0 - a_hi * 32.0;

    vec2 n2 = vec2( a_hi , a_lo ) / 31.5 * 4.0 - 2.0;
    float n2_n2 = dot( n2 , n2 );
    vec3 n3 = vec3( sqrt( 1.0 - n2_n2 / 4.0 ) * n2 , 1.0 - n2_n2 / 2.0 );
    return clamp( n3 , -1.0 , 1.0 );
}

void main() {
    // group id of child meshes for sampling texture's ultra
    float pu = uv2.x;
    float pv = 1.0 - fract( currentFrame / totalFrame ) + texShift;
    vec2 shiftUv = vec2( pu, pv );

    vec4 samplePosition = texture2D( positionMap, shiftUv );
    samplePosition *= boundingBoxRange;
    samplePosition += boundingBoxMin;

    // float pScale = samplePosition.w;

    vec4 outPosition = vec4( samplePosition.xyz , 1.0 );

    vec3 cameraF = vec3( 0.5 - uv.x, ( 1.0 - uv.y ) + 0.5, 0.0 );
    cameraF *= vec3( 0.1, 0.1, 0.0 );
    vec4 convertCamera = vec4( cameraF, 1.0 );
    vec4 finalPosition = convertCamera + outPosition;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) + vec4( finalPosition.xy, 0.0, 0.0);

    // float rotation = 0.0;

    // vec3 alignedPosition = vec3( outPosition.x * pScale, outPosition.y * pScale, outPosition.z * pScale) ;

    // vec2 pos = alignedPosition.xy;

    // vec2 rotatedPosition;
    // rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
    // rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;

    // vec4 finalPosition;

    // finalPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
    // finalPosition.xy += rotatedPosition;
    // finalPosition = projectionMatrix * finalPosition;

    // gl_Position = projectionMatrix * modelViewMatrix * outPosition;

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
