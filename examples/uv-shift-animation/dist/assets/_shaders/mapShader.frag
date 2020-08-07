#include <common>
#include <bsdfs>
#include <lights_pars_begin>

varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 projectionUv;
varying vec2 vUv;

uniform vec3 color;
uniform sampler2D tDiffuse;
uniform sampler2D colorTexture;
uniform sampler2D normalTexture;

float blendOverlay( float base, float blend ) {

	return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

}

vec3 blendOverlay( vec3 base, vec3 blend ) {

	return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

}

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

    // 法線の色を取得
    vec3 mNormal = (texture2D(normalTexture, vUv) * 2.0 - 1.0).rgb; // ベクトルへ変換
    vec3 normalVec = normalize( mNormal );         // 標準化

    // ライトの向きと法線マップの法線とで明度算出
    float bright = dot( directLight.direction, normalVec );
    bright = max( 0.0, bright );   // マイナスは0に補正

	vec3 reflection = texture2DProj( tDiffuse, projectionUv ).rgb;

	vec4 colorTex = texture2D( colorTexture, vUv );

	gl_FragColor = vec4( blendOverlay( reflection, color ), 1.0 ) + colorTex + bright;

}
