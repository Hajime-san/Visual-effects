// Shader targeted for low end devices. Single Pass Forward Rendering.
Shader "sidefx/lwrp/VAT RBD Simple Lit"
{
    // Keep properties of StandardSpecular shader for upgrade reasons.
    Properties
    {
        //VAT Properties
        _pivMax("Pivot Max", Float) = 1.0
        _pivMin("Pivot Min", Float) = 1.0
        _posMax("Position Max", Float) = 1.0
        _posMin("Position Min", Float) = 1.0
        _numOfFrames("Number Of Frames", int) = 240
        _speed("Speed", Float) = 1.0
        _doubleTex ("Double Texture (Higher Precision)", Float) = 0.0
        _padPowTwo ("Power of 2", Float) = 0.0
        _textureSizeX ("Active Pixels X", Int) = 128
        _textureSizeY ("Active Pixels Y", Int) = 128
        _paddedSizeX ("Padded Size X", Int) = 128
        _paddedSizeY ("Padded Size Y", Int) = 128
        _posTex ("Position Map (RGB)", 2D) = "white" {}
        _posTex2 ("Position Map 2 (RGB)", 2D) = "white" {}
        _rotTex ("Rotation Map (RGB)", 2D) = "grey" {}

        _BaseColor("Base Color", Color) = (0.5, 0.5, 0.5, 1)
        _BaseMap("Base Map (RGB) Smoothness / Alpha (A)", 2D) = "white" {}

        _Cutoff("Alpha Cutoff", Range(0.0, 1.0)) = 0.5

        _Shininess("Shininess", Range(0.01, 1.0)) = 0.5
        _GlossMapScale("Smoothness Factor", Range(0.0, 1.0)) = 1.0

        _Glossiness("Glossiness", Range(0.0, 1.0)) = 0.5
        [Enum(Specular Alpha,0,Albedo Alpha,1)] _SmoothnessTextureChannel("Smoothness texture channel", Float) = 0

        [HideInInspector] _SpecSource("Specular Color Source", Float) = 0.0
        _SpecColor("Specular", Color) = (0.5, 0.5, 0.5)
        _SpecGlossMap("Specular", 2D) = "white" {}
        [HideInInspector] _GlossinessSource("Glossiness Source", Float) = 0.0
        [ToggleOff] _SpecularHighlights("Specular Highlights", Float) = 1.0
        [ToggleOff] _GlossyReflections("Glossy Reflections", Float) = 1.0

        [HideInInspector] _BumpScale("Scale", Float) = 1.0
        [NoScaleOffset] _BumpMap("Normal Map", 2D) = "bump" {}

        _EmissionColor("Emission Color", Color) = (0,0,0)
        _EmissionMap("Emission", 2D) = "white" {}

        // Blending state
        [HideInInspector] _Surface("__surface", Float) = 0.0
        [HideInInspector] _Blend("__blend", Float) = 0.0
        [HideInInspector] _AlphaClip("__clip", Float) = 0.0
        [HideInInspector] _SrcBlend("__src", Float) = 1.0
        [HideInInspector] _DstBlend("__dst", Float) = 0.0
        [HideInInspector] _ZWrite("__zw", Float) = 1.0
        [HideInInspector] _Cull("__cull", Float) = 2.0

        [ToogleOff] _ReceiveShadows("Receive Shadows", Float) = 1.0
    }

    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "LightweightPipeline" "IgnoreProjector" = "True"}
        LOD 300

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "LightweightForward" }

            // Use same blending / depth states as Standard shader
            Blend[_SrcBlend][_DstBlend]
            ZWrite[_ZWrite]
            Cull[_Cull]

            HLSLPROGRAM

            // Required to compile gles 2.0 with standard srp library
            #pragma prefer_hlslcc gles
            #pragma exclude_renderers d3d11_9x
            #pragma target 2.0

            // -------------------------------------
            // Material Keywords
            #pragma shader_feature _ALPHATEST_ON
            #pragma shader_feature _ALPHAPREMULTIPLY_ON
            #pragma shader_feature _ _SPECGLOSSMAP _SPECULAR_COLOR
            #pragma shader_feature _GLOSSINESS_FROM_BASE_ALPHA
            #pragma shader_feature _NORMALMAP
            #pragma shader_feature _EMISSION
            #pragma shader_feature _RECEIVE_SHADOWS_OFF

            // -------------------------------------
            // Lightweight Pipeline keywords
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile _ _ADDITIONAL_LIGHT_SHADOWS
            #pragma multi_compile _ _SHADOWS_SOFT
            #pragma multi_compile _ _MIXED_LIGHTING_SUBTRACTIVE

            // -------------------------------------
            // Unity defined keywords
            #pragma multi_compile _ DIRLIGHTMAP_COMBINED
            #pragma multi_compile _ LIGHTMAP_ON
            #pragma multi_compile_fog

            //--------------------------------------
            // GPU Instancing
            #pragma multi_compile_instancing

            #pragma vertex LitPassVertexSimple
            #pragma fragment LitPassFragmentSimple
            #define BUMP_SCALE_NOT_SUPPORTED 1

            #include "./SimpleLitVATRigidInput.hlsl"
            #include "./SimpleLitVATRigidForwardPass.hlsl"

            ENDHLSL
        }

        Pass
        {
            Name "ShadowCaster"
            Tags{"LightMode" = "ShadowCaster"}

            ZWrite On
            ZTest LEqual
            Cull[_Cull]

            HLSLPROGRAM
            // Required to compile gles 2.0 with standard srp library
            #pragma prefer_hlslcc gles
            #pragma exclude_renderers d3d11_9x
            #pragma target 2.0

            // -------------------------------------
            // Material Keywords
            #pragma shader_feature _ALPHATEST_ON
            #pragma shader_feature _GLOSSINESS_FROM_BASE_ALPHA

            //--------------------------------------
            // GPU Instancing
            #pragma multi_compile_instancing

            #pragma vertex ShadowPassVertex
            #pragma fragment ShadowPassFragment

            #include "./SimpleLitVATRigidInput.hlsl"
            #include "Packages/com.unity.render-pipelines.lightweight/Shaders/ShadowCasterPass.hlsl"
            ENDHLSL
        }

        Pass
        {
            Name "DepthOnly"
            Tags{"LightMode" = "DepthOnly"}

            ZWrite On
            ColorMask 0
            Cull[_Cull]

            HLSLPROGRAM
            // Required to compile gles 2.0 with standard srp library
            #pragma prefer_hlslcc gles
            #pragma exclude_renderers d3d11_9x
            #pragma target 2.0

            #pragma vertex DepthOnlyVertex
            #pragma fragment DepthOnlyFragment

            // -------------------------------------
            // Material Keywords
            #pragma shader_feature _ALPHATEST_ON
            #pragma shader_feature _GLOSSINESS_FROM_BASE_ALPHA

            //--------------------------------------
            // GPU Instancing
            #pragma multi_compile_instancing

            #include "./SimpleLitVATRigidInput.hlsl"
            #include "Packages/com.unity.render-pipelines.lightweight/Shaders/DepthOnlyPass.hlsl"
            ENDHLSL
        }

        // This pass it not used during regular rendering, only for lightmap baking.
        Pass
        {
            Name "Meta"
            Tags{ "LightMode" = "Meta" }

            Cull Off

            HLSLPROGRAM
            // Required to compile gles 2.0 with standard srp library
            #pragma prefer_hlslcc gles
            #pragma exclude_renderers d3d11_9x
            #pragma vertex LightweightVertexMeta
            #pragma fragment LightweightFragmentMetaSimple

            #pragma shader_feature _EMISSION
            #pragma shader_feature _SPECGLOSSMAP

            #include "./SimpleLitVATRigidInput.hlsl"
            #include "Packages/com.unity.render-pipelines.lightweight/Shaders/SimpleLitMetaPass.hlsl"

            ENDHLSL
        }
    }
    Fallback "Hidden/InternalErrorShader"
    // CustomEditor "UnityEditor.Experimental.Rendering.LightweightPipeline.SimpleLitShaderGUI"
    // CustomEditor "LWRP_VATShaders.SimpleLitVATShaderGUI"
}


#ifndef LIGHTWEIGHT_SIMPLE_LIT_VAT_PASS_INCLUDED
#define LIGHTWEIGHT_SIMPLE_LIT_VAT_PASS_INCLUDED

#include "Packages/com.unity.render-pipelines.lightweight/ShaderLibrary/Lighting.hlsl"

struct Attributes
{
    float4 positionOS    : POSITION;
    float3 normalOS      : NORMAL;
    float4 tangentOS     : TANGENT;
    float4 texcoord      : TEXCOORD0;
    float4 texcoord1     : TEXCOORD1; // Use this for a mesh material
    // float3 center        : TEXCOORD1; // Use this for particle system
    float2 lightmapUV    : TEXCOORD2;
    float4 color         : COLOR;
    UNITY_VERTEX_INPUT_INSTANCE_ID
};

struct Varyings
{
    float4 uv                       : TEXCOORD0;
    DECLARE_LIGHTMAP_OR_SH(lightmapUV, vertexSH, 2);

    float4 posWSShininess           : TEXCOORD3;    // xyz: posWS, w: Shininess * 128

#ifdef _NORMALMAP
    half4 normal                    : TEXCOORD4;    // xyz: normal, w: viewDir.x
    half4 tangent                   : TEXCOORD5;    // xyz: tangent, w: viewDir.y
    half4 bitangent                 : TEXCOORD6;    // xyz: bitangent, w: viewDir.z
#else
    half3 normal                    : TEXCOORD4;
    half3 viewDir                   : TEXCOORD5;
#endif

    half4 fogFactorAndVertexLight   : TEXCOORD7; // x: fogFactor, yzw: vertex light

#ifdef _MAIN_LIGHT_SHADOWS
    float4 shadowCoord              : TEXCOORD8;
#endif

    float4 positionCS               : SV_POSITION;
    UNITY_VERTEX_INPUT_INSTANCE_ID
    UNITY_VERTEX_OUTPUT_STEREO
};


void InitializeInputData(Varyings input, half3 normalTS, out InputData inputData)
{
    inputData.positionWS = input.posWSShininess.xyz;

#ifdef _NORMALMAP
    half3 viewDirWS = half3(input.normal.w, input.tangent.w, input.bitangent.w);
    inputData.normalWS = TransformTangentToWorld(normalTS,
        half3x3(input.tangent.xyz, input.bitangent.xyz, input.normal.xyz));
#else
    half3 viewDirWS = input.viewDir;
    inputData.normalWS = input.normal;
#endif

#if SHADER_HINT_NICE_QUALITY
    viewDirWS = SafeNormalize(viewDirWS);
#endif

    inputData.normalWS = NormalizeNormalPerPixel(inputData.normalWS);

    inputData.viewDirectionWS = viewDirWS;
#if defined(_MAIN_LIGHT_SHADOWS) && !defined(_RECEIVE_SHADOWS_OFF)
    inputData.shadowCoord = input.shadowCoord;
#else
    inputData.shadowCoord = float4(0, 0, 0, 0);
#endif
    inputData.fogCoord = input.fogFactorAndVertexLight.x;
    inputData.vertexLighting = input.fogFactorAndVertexLight.yzw;
    inputData.bakedGI = SAMPLE_GI(input.lightmapUV, input.vertexSH, inputData.normalWS);
}

///////////////////////////////////////////////////////////////////////////////
//                  Vertex and Fragment functions                            //
///////////////////////////////////////////////////////////////////////////////

// Used in Standard (Simple Lighting) shader
Varyings LitPassVertexSimple(Attributes input)
{
    Varyings output = (Varyings)0;

    UNITY_SETUP_INSTANCE_ID(input);
    UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(output);

    //Fetch vertex position from pos and rot VAT textures
    VATAttributes outputVAT = GetAttributesFromTexture(TEXTURE2D_ARGS(_posTex, sampler_posTex),
                    TEXTURE2D_ARGS(_posTex, sampler_posTex), TEXTURE2D_ARGS(_rotTex, sampler_rotTex),
                    input.texcoord, input.texcoord1, input.color, input.positionOS, input.normalOS);

    VertexPositionInputs vertexInput = GetVertexPositionInputs(outputVAT.positionVAT.xyz);
    // VertexNormalInputs normalInput = GetVertexNormalInputs(input.normalOS, input.tangentOS);

    // I'm not modifying the tangents in the GetVertexPositionInputs function which
    // might be a problem...

    VertexNormalInputs normalInput = GetVertexNormalInputs(outputVAT.normalVAT, input.tangentOS);
    half3 viewDirWS = GetCameraPositionWS() - vertexInput.positionWS;

#if !SHADER_HINT_NICE_QUALITY
    viewDirWS = SafeNormalize(viewDirWS);
#endif

    half3 vertexLight = VertexLighting(vertexInput.positionWS, normalInput.normalWS);
    half fogFactor = ComputeFogFactor(vertexInput.positionCS.z);

    output.uv.xy = TRANSFORM_TEX(input.texcoord, _BaseMap);
    // output.custom.xy = input.texcoord1.zw;

    output.posWSShininess.xyz = vertexInput.positionWS;
    output.posWSShininess.w = _Shininess * 128.0;
    output.positionCS = vertexInput.positionCS;

#ifdef _NORMALMAP
    output.normal = half4(normalInput.normalWS, viewDirWS.x);
    output.tangent = half4(normalInput.tangentWS, viewDirWS.y);
    output.bitangent = half4(normalInput.bitangentWS, viewDirWS.z);
#else
    output.normal = normalInput.normalWS;
    output.viewDir = viewDirWS;
#endif

    OUTPUT_LIGHTMAP_UV(input.lightmapUV, unity_LightmapST, output.lightmapUV);
    OUTPUT_SH(output.normal.xyz, output.vertexSH);

    output.fogFactorAndVertexLight = half4(fogFactor, vertexLight);

#if defined(_MAIN_LIGHT_SHADOWS) && !defined(_RECEIVE_SHADOWS_OFF)
    output.shadowCoord = GetShadowCoord(vertexInput);
#endif

    return output;
}

// Used for StandardSimpleLighting shader
half4 LitPassFragmentSimple(Varyings input) : SV_Target
{
    UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);

    float2 uv = input.uv;
    half4 diffuseAlpha = SampleAlbedoAlpha(uv, TEXTURE2D_ARGS(_BaseMap, sampler_BaseMap));
    half3 diffuse = diffuseAlpha.rgb * _BaseColor.rgb;
    half alpha = diffuseAlpha.a * _BaseColor.a;
    AlphaDiscard(alpha, _Cutoff);
#ifdef _ALPHAPREMULTIPLY_ON
    diffuse *= alpha;
#endif

    half3 normalTS = SampleNormal(uv, TEXTURE2D_ARGS(_BumpMap, sampler_BumpMap));
    half3 emission = SampleEmission(uv, _EmissionColor.rgb, TEXTURE2D_ARGS(_EmissionMap, sampler_EmissionMap));
    half4 specular = SampleSpecularSmoothness(uv, diffuseAlpha.a, _SpecColor, TEXTURE2D_ARGS(_SpecGlossMap, sampler_SpecGlossMap));
    half shininess = input.posWSShininess.w;

    InputData inputData;
    InitializeInputData(input, normalTS, inputData);

    half4 color = LightweightFragmentBlinnPhong(inputData, diffuse, specular, shininess, emission, alpha);
    color.rgb = MixFog(color.rgb, inputData.fogCoord);
    return color;
};

#endif


//  input shader

#ifndef LIGHTWEIGHT_SIMPLE_LIT_VAT_INPUT_INCLUDED
#define LIGHTWEIGHT_SIMPLE_LIT_VAT_INPUT_INCLUDED

#include "Packages/com.unity.render-pipelines.lightweight/ShaderLibrary/Core.hlsl"
#include "Packages/com.unity.render-pipelines.lightweight/ShaderLibrary/SurfaceInput.hlsl"

CBUFFER_START(UnityPerMaterial)
float4 _BaseMap_ST;
half4 _BaseColor;
half4 _SpecColor;
half4 _EmissionColor;
half _Cutoff;
half _Shininess;

//--------------------------------------
// Declare shader properties
uniform float _pivMax;
uniform float _pivMin;
uniform float _posMax;
uniform float _posMin;
uniform int _numOfFrames;
uniform float _speed;
uniform int _doubleTex;
uniform int _padPowTwo;
uniform float _textureSizeX;
uniform float _textureSizeY;
uniform float _paddedSizeX;
uniform float _paddedSizeY;
CBUFFER_END

TEXTURE2D(_posTex);
SAMPLER(sampler_posTex);
TEXTURE2D(_posTex2);
SAMPLER(sampler_posTex2);
TEXTURE2D(_rotTex);
SAMPLER(sampler_rotTex);

struct VATAttributes
{
    float3 positionVAT;
    float3 normalVAT;
};

VATAttributes GetAttributesFromTexture(TEXTURE2D_PARAM(_posTex, samplerPosTex),
    TEXTURE2D_PARAM(_posTex2, samplerPosTex2), TEXTURE2D_PARAM(_rotTex, samplerRotTex),
    float4 uv, float4 uv2, float4 vertexCd, float4 vertexPos, float3 vertexN)
{
    VATAttributes output;
    float FPS = 24.0;
    float FPS_div_Frames = FPS / _numOfFrames;
    //Use the line below if you want to use time to animate the object
    float timeInFrames = frac(_speed * _Time.y);
    //The line below is particle age to drive the animation. Comment it out if you want to use time above.
    // timeInFrames = uv.z;

    timeInFrames = ceil(timeInFrames * _numOfFrames);
    timeInFrames /= _numOfFrames;
    timeInFrames += (1/_numOfFrames);

    float x_ratio = _textureSizeX/_paddedSizeX;
    float y_ratio = _textureSizeY/_paddedSizeY;
    float uv2y = 0;
    float uv2x = 0;
    if (_padPowTwo) {
        uv2x = uv2.x * x_ratio;
        uv2y = (1 - (timeInFrames * y_ratio)) + (1 - ((1 - uv2.y) * y_ratio));
    }
    else {
        uv2y = (1 - timeInFrames) + uv2.y;
        uv2x = uv2.x;
    }

    //get position and rotation(quaternion) from textures
    float4 texturePos = SAMPLE_TEXTURE2D_LOD(_posTex, samplerPosTex,
        float2(uv2x, uv2y),0);
    float4 textureRot = (SAMPLE_TEXTURE2D_LOD(_rotTex, samplerRotTex,
        float2(uv2x, uv2y),0));
    if (_doubleTex){
        float3 texturePos2 = SAMPLE_TEXTURE2D_LOD(_posTex2, samplerPosTex2,
        float2(uv2x, uv2y),0);
        texturePos.xyz += (texturePos2 * 0.01);
    }

    //expand normalised position texture values to world space
    float expand1 = _posMax - _posMin;
    texturePos.xyz *= expand1;
    texturePos.xyz += _posMin;
    // texturePos.x *= -1;  //flipped to account for right-handedness of unity
    // texturePos.xyz = texturePos.xzy;  //swizzle y and z because textures are exported with z-up

    //expand normalised pivot vertex colour values to world space
    float expand = _pivMax - _pivMin;
    float3 pivot = vertexCd.rgb;
    pivot.xyz *= expand;
    pivot.xyz += _pivMin;
    // pivot.x *=  -1;
    // pivot = pivot.xzy;
    float3 atOrigin = vertexPos.xyz - pivot;

    //calculate rotation
    textureRot *= 2.0;
    textureRot -= 1.0;
    float4 quat = 0;

    //swizzle and flip quaternion from ue4 to unity
    // quat.x = textureRot.x;
    // quat.y = -textureRot.y;
    // quat.z = -textureRot.z;
    // quat.w = textureRot.w;
    quat = textureRot;

    float3 rotated = atOrigin + 2.0 * cross(quat.xyz, cross(quat.xyz, atOrigin) + quat.w * atOrigin);

    output.positionVAT = rotated;
    // output.positionVAT = atOrigin;
    output.positionVAT += pivot;
    output.positionVAT += texturePos;
    // output.positionVAT += center;

    //calculate normal
    float3 rotatedNormal = vertexN + 2.0 * cross(quat.xyz, cross(quat.xyz, vertexN) + quat.w * vertexN);
    output.normalVAT = rotatedNormal;

    return output;

}

TEXTURE2D(_SpecGlossMap);       SAMPLER(sampler_SpecGlossMap);

half4 SampleSpecularSmoothness(half2 uv, half alpha, half4 specColor, TEXTURE2D_PARAM(specMap, sampler_specMap))
{
    half4 specularSmoothness = half4(0.0h, 0.0h, 0.0h, 1.0h);
#ifdef _SPECGLOSSMAP
    specularSmoothness = SAMPLE_TEXTURE2D(specMap, sampler_specMap, uv) * specColor;
#elif defined(_SPECULAR_COLOR)
    specularSmoothness = specColor;
#endif

#ifdef _GLOSSINESS_FROM_BASE_ALPHA
    specularSmoothness.a = exp2(10 * alpha + 1);
#else
    specularSmoothness.a = exp2(10 * specularSmoothness.a + 1);
#endif

    return specularSmoothness;
}

#endif
