varying vec2 vUv;

uniform sampler2D brightnessPassTexture;
uniform vec2 resolution;
uniform vec3 blurX1;
uniform vec3 blurX2;
uniform vec3 blurX3;
uniform vec3 blurX4;
uniform vec3 blurX5;
uniform vec3 blurX6;
uniform vec3 blurX7;
uniform vec3 blurX8;
uniform vec3 blurX9;
uniform vec3 blurX10;
uniform vec3 blurX11;
uniform vec3 blurX12;
uniform vec3 blurX13;
uniform vec3 blurX14;
uniform vec3 blurX15;
uniform vec3 blurY1;
uniform vec3 blurY2;
uniform vec3 blurY3;
uniform vec3 blurY4;
uniform vec3 blurY5;
uniform vec3 blurY6;
uniform vec3 blurY7;
uniform vec3 blurY8;
uniform vec3 blurY9;
uniform vec3 blurY10;
uniform vec3 blurY11;
uniform vec3 blurY12;
uniform vec3 blurY13;
uniform vec3 blurY14;
uniform vec3 blurY15;

void main() {

    vec4 horizontalBlur = texture2D( brightnessPassTexture, vUv + blurX1.xy ) * vec4( blurX1.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX2.xy ) * vec4( blurX2.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX3.xy ) * vec4( blurX3.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX4.xy ) * vec4( blurX4.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX5.xy ) * vec4( blurX5.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX6.xy ) * vec4( blurX6.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX7.xy ) * vec4( blurX7.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX8.xy ) * vec4( blurX8.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX9.xy ) * vec4( blurX9.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX10.xy ) * vec4( blurX10.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX11.xy ) * vec4( blurX11.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX12.xy ) * vec4( blurX12.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX13.xy ) * vec4( blurX13.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX14.xy ) * vec4( blurX14.z );
    horizontalBlur += texture2D( brightnessPassTexture, vUv + blurX15.xy ) * vec4( blurX15.z );

    gl_FragColor = horizontalBlur;
}
