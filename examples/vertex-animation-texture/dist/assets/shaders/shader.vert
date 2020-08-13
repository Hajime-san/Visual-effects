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

float frag = 1.0 / indicesLength;
float range = boudingBoxMax + ( boundingBoxMin * - 1.0 );
float texShift = 0.5 * frag;

vec3 getTexelPosition(sampler2D map, vec2 uv, float range, float boxMin) {
    vec3 pos = texture2D( map , uv ).xyz;
    pos *= range;
    pos += boxMin;
    return pos;
}

void main() {
    float pu = fract( frag * _id + texShift );
    float pv = fract( currentFrame / totalFrame ) + texShift;
    vec2 shiftUv = vec2( pu, pv );

    vec4 outPosition = vec4( getTexelPosition( positionMap, shiftUv, range, boundingBoxMin ) , 1.0 );

    gl_Position = projectionMatrix * modelViewMatrix * outPosition;

    vUv = uv;
    vNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4( outPosition.xyz , 1.0 );
    vViewPosition = - mvPosition.xyz;
}
