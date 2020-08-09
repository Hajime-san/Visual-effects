varying vec2 vUv;
varying vec4 vColor;

attribute float _id;
uniform float time;
uniform float boudingBoxMax;
uniform float boundingBoxMin;
uniform float currentFrame;
uniform float indicesLength;
uniform float totalFrame;
uniform sampler2D positionMap;
uniform sampler2D normalTexture;

void main() {
    vUv = uv;
    float frag = 1.0 / indicesLength;
    float range = boudingBoxMax + ( boundingBoxMin * -1.0);
    float pu = frag * _id;

    float pv = 1.0 - fract( currentFrame / totalFrame );

    // flip B/G channel
    vec3 texelPosition = texture2D( positionMap , vec2(pu, pv) ).rbg * range + boundingBoxMin;

    vec3 tColor = texture2D( positionMap, vec2(pu, pv) ).rgb;
    vColor = vec4( vec3( tColor ), 1.0 );

    gl_Position = projectionMatrix * modelViewMatrix * vec4( texelPosition + position, 1.0 );
}
