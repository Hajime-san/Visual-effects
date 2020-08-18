#define USE_NORMAL_MAP_VECTOR

varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;

attribute float _id;
uniform float time;
uniform float boudingBoxMax;
uniform float boundingBoxMin;
uniform float indicesLength;
uniform float currentFrame;
uniform float totalFrame;
uniform sampler2D positionMap;
uniform sampler2D normalMap;

float frag = 1.0 / indicesLength;
float boundingBoxRange = boudingBoxMax + ( boundingBoxMin * - 1.0 );
float texShift = 0.5 * frag;

vec3 VAT_UnpackAlpha(float a) {
    float a_hi = floor( a * 32.0 );
    float a_lo = a * 32.0 * 32.0 - a_hi * 32.0;

    vec2 n2 = vec2( a_hi , a_lo ) / 31.5 * 4.0 - 2.0;
    float n2_n2 = dot( n2 , n2 );
    vec3 n3 = vec3( sqrt( 1.0 - n2_n2 / 4.0 ) * n2 , 1.0 - n2_n2 / 2.0 );
    return clamp( n3 , -1.0 , 1.0 );
}

void main() {
    float pu = fract( frag * _id + texShift );
    float pv = 1.0 - fract( currentFrame / totalFrame ) + texShift;
    vec2 shiftUv = vec2( pu, pv );

    vec4 texelPosition = texture2D( positionMap, shiftUv );
    texelPosition *= range;
    texelPosition += boundingBoxMin;

    vec4 outPosition = vec4( texelPosition.rgb , 1.0 );

    gl_Position = projectionMatrix * modelViewMatrix * outPosition;

    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4( outPosition.xyz, 1.0 );
    vViewPosition = - mvPosition.xyz;

    #ifdef USE_NORMAL_MAP_VECTOR

        vec4 texelNormalPosition = texture2D( normalMap, shiftUv );
        vNormal = normalMatrix * texelNormalPosition.rgb;

    #else
        // Quality isn't high enough(work in progress)
        vec3 decodedNormal = VAT_UnpackAlpha( texelPosition.a );
        vNormal = normalMatrix * decodedNormal;

    #endif
}
