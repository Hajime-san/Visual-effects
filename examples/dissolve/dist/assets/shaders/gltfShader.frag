#include <common>
#include <bsdfs>
#include <lights_pars_begin>

varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vPosition;

uniform float time;
uniform sampler2D noiseTexture;

float thresHold = 0.5;
float edgeWidth = 0.2;
float strength = 2.0;
float speed = 0.5;

vec3 edgeColor = vec3(1.0, 0.0, 0.0);

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

    float repeat = abs(fract(time * speed) * (strength + thresHold + edgeWidth));

    float transitionDirection = 1.0 - vPosition.y;

    vec4 noiseMap = texture2D(noiseTexture, vUv) + transitionDirection * strength;

    float intensity = ((edgeWidth + 1.0) * (strength - thresHold)) * repeat;

    float disSolve = smoothstep(intensity - edgeWidth, intensity, noiseMap.r);

    vec4 finalColor = vec4((edgeColor - outgoingLight) * (1.0 - disSolve) + outgoingLight, disSolve);

    gl_FragColor = finalColor;
}
