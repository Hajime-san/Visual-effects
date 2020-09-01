#define SHIFT 0.5
#define OPACITY 2.0

#include <common>
#include <bsdfs>
#include <lights_pars_begin>

varying vec2 vUv1;
varying vec2 vUv2;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vPosition;

uniform float time;
uniform float speed;
uniform sampler2D texture;

void main() {

    vec3 mvPosition = vViewPosition;
    vec3 transformedNormal = vNormal;

    // ref: https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderChunk/lights_lambert_vertex.glsl.js
    GeometricContext geometry;
    geometry.position = mvPosition.xyz;
    geometry.normal = normalize(transformedNormal);
    geometry.viewDir = (normalize(-mvPosition.xyz));
    vec3 lightFront = vec3(0.0);
    vec3 indirectFront = vec3(0.0);
    IncidentLight directLight;
    float dotNL;
    vec3 directLightColor_Diffuse;

    #if NUM_DIR_LIGHTS > 0
    #pragma unroll_loop
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
        getDirectionalDirectLightIrradiance(directionalLights[ i ], geometry, directLight);
        dotNL = dot(geometry.normal, directLight.direction);
        directLightColor_Diffuse = PI * directLight.color;
        lightFront += saturate(dotNL) * directLightColor_Diffuse;
    }
    #endif


    float velocity = fract(time * speed);

    vec4 tex1 = texture2D( texture, mix(vUv1, vUv2, velocity));

    vec4 tex2 = texture2D( texture, mix(vUv1, vUv2, fract(velocity + SHIFT)) );

    float blendAnimation = abs(velocity - SHIFT) * 2.0;

    vec3 baseAnimation = mix(tex1.xyz, tex2.xyz, blendAnimation);

    float alpha = mix(tex1.a, tex2.a, blendAnimation) * OPACITY;

    vec4 smokeColor = vec4(1.0,1.0,1.0,0.0);

    vec3 baseColor = baseAnimation * smokeColor.xyz;

    // vec4 finalColor = vec4(baseColor, alpha);

    vec3 lightVector = directLight.direction;

    vec3 lightColor = directLight.color + ambientLightColor;

    vec3 saturatedColor = baseColor * saturate(dotNL);

    float invertLightStrength = saturate( dotNL * - 1.0 ) * 0.2;

    float backShadow = 1.0 - alpha * alpha * 0.8;

    vec3 lightStrength = lightColor * 1.0;

    vec3 scatterLightColor = (saturatedColor + ( invertLightStrength * backShadow )) * lightStrength;

    vec4 finalColor = vec4( scatterLightColor, alpha );

    gl_FragColor = finalColor;
}
