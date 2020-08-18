varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vColor;

attribute float _id;
attribute vec2 uv2;
attribute vec3 color;

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

float frag = 1.0 / indicesLength;
float range = boudingBoxMax + ( boundingBoxMin * - 1.0 );
float pivotRange = pivotMax + ( pivotMin * - 1.0 );
float texShift = 0.5 * frag;

vec4 DecodeQuaternion(vec4 encodedRotation) {
    return vec4(mix( vec4(-1.0), vec4(1.0), encodedRotation));
}

vec3 RotateVectorUsingQuaternionFast(vec4 q, vec3 v) {
    vec3 t = 2.0 * cross(q.xyz, v);
    return v + q.w * t + cross(q.xyz, t);
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
    float pu = uv2.x;
    float pv = 1.0 - fract( currentFrame / totalFrame ) + texShift;
    vec2 shiftUv = vec2( pu, pv );

    vec4 texelPosition = texture2D( positionMap, shiftUv );
    texelPosition *= range;
    texelPosition += boundingBoxMin;

    vec4 rotationPosition = texture2D( rotationMap, shiftUv );
    vec4 rotation = DecodeQuaternion( rotationPosition );

    vec3 pivot = color;
    pivot *= pivotRange;
    pivot += pivotMin;

    vec3 offset = position - pivot;
    vec3 rotated = RotateVectorUsingQuaternionFast( rotation, offset );

    vec3 outPosition = rotated + texelPosition.rgb;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( outPosition, 1.0 );

    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4( outPosition, 1.0 );
    vViewPosition = - mvPosition.xyz;

    vColor = color;

    vNormal = normalMatrix * RotateVectorUsingQuaternionFast( rotation, normal );
}
