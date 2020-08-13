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

void main() {
    vUv = uv;
    float frag = 1.0 / indicesLength;
    float range = boudingBoxMax + ( boundingBoxMin * - 1.0);
    float pu = frag * _id;
    float pv = 1.0 - fract( currentFrame / totalFrame );

    vec3 texelPosition = texture2D( positionMap , vec2( pu , pv ) ).rgb * range + boundingBoxMin;

    vec4 outPosition = vec4( texelPosition , 1.0 );

    vNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(outPosition.xyz, 1.0);
    vViewPosition = - mvPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * outPosition;
}
