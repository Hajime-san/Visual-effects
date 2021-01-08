varying vec2 vUv;

uniform sampler2D colorPassTexture;
uniform float thresHold;

void main() {

    vec4 scene = texture2D( colorPassTexture, vUv );

    vec3 pick = step( vec3( thresHold ), scene.rgb );

    gl_FragColor = vec4( pick , 1.0 );


    // if( pick.r > 0.8 ) {
    //     gl_FragColor = vec4( pick + 0.3 , 1.0 );
    // } else {
    //     gl_FragColor = vec4( pick , 1.0 );
    // }

    // vec4 color;
    // color.xyz = 1.0 - exp( -0.5 * scene.xyz);
    // // gamma coreect
    // gl_FragColor = vec4(
    //                 pow(color.x, 1.0/2.2),
    //                 pow(color.y, 1.0/2.2),
    //                 pow(color.z, 1.0/2.2),
    //                 color.w);

    // vec3 luminances = vec3( 0.2126, 0.7152, 0.0722 );
    // vec4 texel = texture2D( colorPassTexture, vUv );

    // float luminance = dot(luminances, texel.rgb);

    // luminance = max(0.0, luminance - thresHold);

    // texel.rgb *= sign(luminance);
    // texel.a = 1.0;

    // gl_FragColor = texel;
}
