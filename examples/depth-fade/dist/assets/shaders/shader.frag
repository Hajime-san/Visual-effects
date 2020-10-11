uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
varying vec3 vViewPosition;
varying vec3 vNormal;

#include <common>
#include <packing>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>

varying vec2 vUv;
varying vec4 vUvProj;
varying float partZ;

uniform sampler2D depthMap;
uniform float thresHold;
uniform vec4 ZBufferParams;


float LinearEyeDepth(float z, vec4 _ZBufferParams) {
    return 1.0 / (_ZBufferParams.z * z + _ZBufferParams.w);
}


void main() {

	float alpha = 1.0;

	vec4 baseColor = vec4( 0.2, 0.5, 0.8, alpha );

	float sceneZ = LinearEyeDepth( texture2DProj( depthMap, vUvProj ).r, ZBufferParams );

	float fade = saturate (thresHold * ( sceneZ - partZ ) );

	vec4 diffuseColor = baseColor;
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

	vec3 finalColor = outgoingLight * baseColor.rgb;

	gl_FragColor = vec4( finalColor, baseColor.a * fade);
}
