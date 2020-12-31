varying vec2 vUv;

uniform sampler2D horizontalPassTexture;
uniform sampler2D colorPassTexture;
uniform vec2 resolution;
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

vec4 kawaseBloom( sampler2D texture, vec2 uv, float texturesize, float iteration ) {
    vec2 texelSize = vec2( 1.0 / texturesize );
    vec2 texelSize05 = texelSize * 0.5;

    vec2 uvOffset = texelSize.xy * vec2( iteration, iteration ) + texelSize05;

    vec2 texCoordSample;
    vec4 color;

    texCoordSample.x = uv.x - uvOffset.x;
    texCoordSample.y = uv.y + uvOffset.y;
    color = texture2D( texture, texCoordSample );

    texCoordSample.x = uv.x + uvOffset.x;
    texCoordSample.y = uv.y + uvOffset.y;
    color += texture2D( texture, texCoordSample );

    texCoordSample.x = uv.x + uvOffset.x;
    texCoordSample.y = uv.y - uvOffset.y;
    color += texture2D( texture, texCoordSample );

    texCoordSample.x = uv.x - uvOffset.x;
    texCoordSample.y = uv.y - uvOffset.y;
    color += texture2D( texture, texCoordSample );

    return color * 0.25;
}

void main() {

    vec4 colorPass = texture2D( colorPassTexture, vUv );

    vec4 verticalBlur = texture2D( horizontalPassTexture, vUv + blurY1.xy ) * vec4( blurY1.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY2.xy ) * vec4( blurY2.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY3.xy ) * vec4( blurY3.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY4.xy ) * vec4( blurY4.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY5.xy ) * vec4( blurY5.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY6.xy ) * vec4( blurY6.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY7.xy ) * vec4( blurY7.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY8.xy ) * vec4( blurY8.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY9.xy ) * vec4( blurY9.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY10.xy ) * vec4( blurY10.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY11.xy ) * vec4( blurY11.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY12.xy ) * vec4( blurY12.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY13.xy ) * vec4( blurY13.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY14.xy ) * vec4( blurY14.z );
    verticalBlur += texture2D( horizontalPassTexture, vUv + blurY15.xy ) * vec4( blurY15.z );

    gl_FragColor = colorPass + verticalBlur;
}
