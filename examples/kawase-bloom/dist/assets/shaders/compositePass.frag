varying vec2 vUv;

uniform sampler2D colorPassTexture;
uniform sampler2D blurBuffer0;
uniform sampler2D blurBuffer1;
uniform sampler2D blurBuffer2;
uniform sampler2D blurBuffer3;
uniform sampler2D blurBuffer4;
uniform sampler2D blurBuffer5;

void main() {

    vec4 colorPass = texture2D( colorPassTexture, vUv );

    vec4 result;

    result += texture2D( blurBuffer0, vUv );
    result += texture2D( blurBuffer1, vUv );
    result += texture2D( blurBuffer2, vUv );
    result += texture2D( blurBuffer3, vUv );
    result += texture2D( blurBuffer4, vUv );
    result += texture2D( blurBuffer5, vUv );

    gl_FragColor = colorPass + result;
}
