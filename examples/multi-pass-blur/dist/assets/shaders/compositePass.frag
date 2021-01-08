varying vec2 vUv;

uniform sampler2D colorPassTexture;
uniform sampler2D colorBuffer1;
uniform sampler2D colorBuffer2;
uniform sampler2D colorBuffer3;

void main() {

    vec4 colorPass = texture2D( colorPassTexture, vUv );

    vec4 result;

    result += texture2D( colorBuffer1, vUv );
    result += texture2D( colorBuffer2, vUv );
    result += texture2D( colorBuffer3, vUv );

    gl_FragColor = colorPass + result;
}
