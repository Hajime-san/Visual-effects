varying vec2 vUv;

uniform sampler2D horizontalPassTexture;
uniform sampler2D colorPassTexture;
uniform vec3 deviation[15];

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

    vec4 result;

    for(int i = 0; i < 15; ++i) {
        result += texture2D( horizontalPassTexture, vUv + deviation[i].xy ) * vec4( deviation[i].z );
    }

    gl_FragColor = colorPass + result;
}
