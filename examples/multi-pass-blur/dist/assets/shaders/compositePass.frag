varying vec2 vUv;

uniform sampler2D colorBuffer;
uniform sampler2D colorBuffer2;
uniform sampler2D colorBuffer3;
uniform sampler2D compositeBuffer;

void main() {

    vec4 colorPass = texture2D( colorBuffer, vUv );

    vec4 result;

    result += texture2D( colorBuffer2, vUv );
    result += texture2D( colorBuffer3, vUv );
    result += texture2D( compositeBuffer, vUv );

    gl_FragColor = colorPass + result;
}
