varying vec2 vUv;

uniform sampler2D colorPassTexture;
uniform float thresHold;

void main() {

    vec4 scene = texture2D( colorPassTexture, vUv );

    vec3 pick = step( vec3( thresHold ), scene.rgb );

    gl_FragColor = vec4( pick , 1.0 );
}
