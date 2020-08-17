#define USE_NORMAL_MAP_VECTOR

varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;

attribute float _id;
attribute vec3 _rest;

uniform float time;
uniform float boudingBoxMax;
uniform float boundingBoxMin;
uniform float pivotMax;
uniform float pivotMin;
uniform float indicesLength;
uniform float currentFrame;
uniform float totalFrame;
uniform sampler2D positionMap;
uniform sampler2D rotationMap;
uniform sampler2D normalMap;

float frag = 1.0 / indicesLength;
float range = boudingBoxMax + ( boundingBoxMin * - 1.0 );
float texShift = 0.5 * frag;

vec3 VAT_RotateVector(vec3 v, vec4 q) {
    return v + cross(2.0 * q.xyz, cross(q.xyz, v) + q.w * v);
}

vec3 unpackAlpha(float a) {
    float a_hi = floor( a * 32.0 );
    float a_lo = a * 32.0 * 32.0 - a_hi * 32.0;

    vec2 n2 = vec2( a_hi , a_lo ) / 31.5 * 4.0 - 2.0;
    float n2_n2 = dot( n2 , n2 );
    vec3 n3 = vec3( sqrt( 1.0 - n2_n2 / 4.0 ) * n2 , 1.0 - n2_n2 / 2.0 );
    return clamp( n3 , -1.0 , 1.0 );
}

void main() {
    vec3 restorePivot = pivotMax * _rest - pivotMin;
    vec3 pivot = _rest;

    float pu = fract( frag * _id + texShift );
    float pv = 1.0 - fract( currentFrame / totalFrame ) + texShift;
    vec2 shiftUv = vec2( pu, pv );

    vec4 texelPosition = texture2D( positionMap, shiftUv );
    texelPosition *= range;
    texelPosition += boundingBoxMin;

    vec4 rotationPosition = texture2D( rotationMap, shiftUv );

    vec4 rot = (rotationPosition * 2.0 - 1.0) * vec4(-1.0, 1.0, 1.0, 1.0);

    vec3 outPosition = VAT_RotateVector(position - pivot, rot) + pivot + texelPosition.rgb;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( outPosition, 1.0 );

    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4( outPosition.xyz, 1.0 );
    vViewPosition = - mvPosition.xyz;

    #ifdef USE_NORMAL_MAP_VECTOR

        vec4 texelNormalPosition = texture2D( normalMap, shiftUv );
        vNormal = normalMatrix * texelNormalPosition.rgb;

    #else
        // Quality isn't high enough
        vNormal = normalMatrix * unpackAlpha( texelPosition.a );

    #endif
}
