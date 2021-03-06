varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;

attribute vec2 uv2;
attribute vec3 color;

uniform float time;
uniform float boudingBoxMax;
uniform float boundingBoxMin;
uniform float pivotMax;
uniform float pivotMin;
uniform float currentFrame;
uniform float totalFrame;
uniform sampler2D positionMap;
uniform sampler2D rotationMap;

vec4 DecodeQuaternion(vec4 encodedRotation) {
    return vec4(mix( vec4(-1.0), vec4(1.0), encodedRotation));
}

vec3 RotateVectorUsingQuaternionFast(vec4 q, vec3 v) {
    vec3 t = 2.0 * cross(q.xyz, v);
    return v + q.w * t + cross(q.xyz, t);
}

void main() {

    float boundingBoxRange = boudingBoxMax - boundingBoxMin;
    float pu = uv2.x;
    float pv = 1.0 - fract( currentFrame / totalFrame );
    // float nextPv = 1.0 - fract( ceil( currentFrame ) / totalFrame );
    vec2 shiftUv = vec2( pu, pv );
    // vec2 shiftNextUv = vec2( pu, nextPv );

    vec4 samplePosition = texture2D( positionMap, shiftUv );
    samplePosition *= boundingBoxRange;
    samplePosition += boundingBoxMin;

    // vec4 sampleNextPosition = texture2D( positionMap, shiftNextUv );
    // sampleNextPosition *= boundingBoxRange;
    // sampleNextPosition += boundingBoxMin;

    // vec4 lerpTwoFrame = mix( samplePosition, sampleNextPosition, fract( currentFrame ) );

    vec4 sampleRotation = texture2D( rotationMap, shiftUv );
    vec4 decodedRotation = DecodeQuaternion( sampleRotation );

    // decode pivot from vertex color
    vec3 pivot = color;
    float pivotRange = pivotMax - pivotMin;
    pivot *= pivotRange;
    pivot += pivotMin;

    vec3 offsetPosition = position - pivot;
    vec3 rotatedPosition = RotateVectorUsingQuaternionFast( decodedRotation, offsetPosition );

    vec3 outPosition = rotatedPosition + samplePosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( outPosition, 1.0 );

    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4( outPosition, 1.0 );
    vViewPosition = - mvPosition.xyz;

    vNormal = normalMatrix * RotateVectorUsingQuaternionFast( decodedRotation, normal );
}
