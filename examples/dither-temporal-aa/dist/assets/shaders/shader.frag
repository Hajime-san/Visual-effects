#define PHYSICAL
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifndef STANDARD
	uniform float clearCoat;
	uniform float clearCoatRoughness;
#endif
varying vec3 vViewPosition;

#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

varying vec2 vUv;

uniform float thresHold;
uniform float TAASampleLevel;
uniform sampler2D ditherMap;
uniform sampler2D tDiffuse;


void main() {

    vec2 screenPosition = gl_FragCoord.xy;

    vec2 antiAliasedScreenResolution = screenPosition + vec2(TAASampleLevel);

    float c = mod( ((antiAliasedScreenResolution.x) + 2.0 * (antiAliasedScreenResolution.y)) , 5.0 );

	vec2 ditherMapResolution = vec2(64.0);

    vec4 ditheredScreenMap = texture2D( ditherMap, screenPosition / ditherMapResolution );

    float n = (c + ditheredScreenMap.r) / 6.0;

    float mask = (n + thresHold) - 0.5;

	vec4 TAAMap = texture2D( tDiffuse, vUv );

	vec4 baseColor = vec4(0.2, 0.5, 0.8, 1.0);


    #include <clipping_planes_fragment>
	vec4 diffuseColor = baseColor;
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

	if( mask > 1.0 ) {
		discard;
	}

	gl_FragColor = vec4( TAAMap.rgb + outgoingLight, thresHold );

	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}
