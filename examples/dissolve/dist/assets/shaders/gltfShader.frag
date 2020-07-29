#include <common>
#include <bsdfs>
#include <lights_pars_begin>

varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;

uniform float time;
uniform sampler2D noiseTexture;

float thresHold = 0.5;
float edgeWidth = 0.2;
float strength = 2.0;

vec3 edgeColor = vec3(0.25, 0.55, 0.75);

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

    ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
    reflectedLight.indirectDiffuse += indirectFront;
    reflectedLight.directDiffuse = lightFront;
    vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;

    float repeat = abs(fract(time * 0.5) * 2.0);

    vec4 noiseMap = texture2D(noiseTexture, vUv) + (1.0 - vUv.y) * strength;

    float intensity = ((edgeWidth + 1.0) * (strength - thresHold)) * repeat;

    float mixed = smoothstep(intensity - edgeWidth, intensity, noiseMap.r);

    vec4 finalColor = vec4(edgeColor * (1.0 - mixed), mixed);

    gl_FragColor = finalColor + vec4(outgoingLight, 0.0);
}
