varying vec2 vUv;
varying vec4 vColor;

attribute float _id;
uniform float time;
uniform float boudingBoxMax;
uniform float boundingBoxMin;
uniform float indicesLength;
uniform float currentFrame;
uniform float totalFrame;
uniform sampler2D positionMap;
uniform sampler2D map;


void main() {
    vUv = uv;
    float frag = 1.0 / indicesLength;
    float range = boudingBoxMax + ( boundingBoxMin * - 1.0);
    float pu = frag * _id;
    float pv = 1.0 - fract( currentFrame / totalFrame );

    vec3 texelPosition = texture2D( positionMap , vec2( pu , pv ) ).rgb * range + boundingBoxMin;

    vec3 tColor = texture2D( map, uv ).rgb;
    vColor = vec4( tColor, 1.0 );

    vec4 outPosition = vec4( texelPosition , 1.0 );

    gl_Position = projectionMatrix * modelViewMatrix * outPosition;
}
