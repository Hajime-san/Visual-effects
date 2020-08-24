#ifndef LIGHTWEIGHT_SIMPLE_LIT_VAT_FLUID_PASS_INCLUDED
#define LIGHTWEIGHT_SIMPLE_LIT_VAT_FLUID_PASS_INCLUDED

#include "Packages/com.unity.render-pipelines.lightweight/ShaderLibrary/Lighting.hlsl"

struct Attributes
{
    float4 positionOS    : POSITION;
    float3 normalOS      : NORMAL;
    float4 tangentOS     : TANGENT;
    float2 texcoord      : TEXCOORD0;
    float4 texcoord1     : TEXCOORD1;
    float2 lightmapUV    : TEXCOORD2;
    float4 color         : COLOR;
    UNITY_VERTEX_INPUT_INSTANCE_ID
};

struct Varyings
{
    float2 uv                       : TEXCOORD0;
    float2 custom                   : TEXCOORD1;
    DECLARE_LIGHTMAP_OR_SH(lightmapUV, vertexSH, 2);

    float4 posWSShininess           : TEXCOORD3;    // xyz: posWS, w: Shininess * 128

#ifdef _NORMALMAP
    half4 normal                    : TEXCOORD4;    // xyz: normal, w: viewDir.x
    half4 tangent                   : TEXCOORD5;    // xyz: tangent, w: viewDir.y
    half4 bitangent                 : TEXCOORD6;    // xyz: bitangent, w: viewDir.z
#else
    half3  normal                   : TEXCOORD4;
    half3 viewDir                   : TEXCOORD5;
#endif

    half4 fogFactorAndVertexLight   : TEXCOORD7; // x: fogFactor, yzw: vertex light

#ifdef _MAIN_LIGHT_SHADOWS
    float4 shadowCoord              : TEXCOORD8;
#endif
    float4 color                    : COLOR;

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
                    TEXTURE2D_ARGS(_posTex2, sampler_posTex2), TEXTURE2D_ARGS(_nTex, sampler_nTex),
                    TEXTURE2D_ARGS(_colorTex, sampler_colorTex), input.texcoord, input.texcoord1,
                    input.color, input.positionOS, input.normalOS);

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

    output.uv = TRANSFORM_TEX(input.texcoord, _BaseMap);
    output.custom = input.texcoord1.zw;

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
    output.color = outputVAT.colorVAT;

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
    half3 diffuse = diffuseAlpha.rgb * _BaseColor.rgb * input.color;

    half alpha = diffuseAlpha.a * _BaseColor.a;
    AlphaDiscard(alpha, _Cutoff); //This seems to be working with the initial position of the
    //billboard but doesn't have an effect on the transformed sprites.

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




#ifndef LIGHTWEIGHT_SIMPLE_LIT_VAT_FLUID_INPUT_INCLUDED
#define LIGHTWEIGHT_SIMPLE_LIT_VAT_FLUID_INPUT_INCLUDED

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
uniform float _posMax;
uniform float _posMin;
uniform int _numOfFrames;
uniform float _width;
uniform float _height;
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
TEXTURE2D(_nTex);
SAMPLER(sampler_nTex);
TEXTURE2D(_colorTex);
SAMPLER(sampler_colorTex);

struct VATAttributes
{
    float3 positionVAT;
    float3 normalVAT;
    float4 colorVAT;
};

VATAttributes GetAttributesFromTexture(TEXTURE2D_PARAM(_posTex, samplerPosTex),
    TEXTURE2D_PARAM(_posTex2, samplerPosTex2), TEXTURE2D_PARAM(_nTex, samplerNTex),
    TEXTURE2D_PARAM(_colorTex, samplerColorTex), float2 uv, float4 uv2, float4 vertexCd,
    float4 vertexPos, float3 vertexN)
{
    VATAttributes output;
    //calculate uv coordinates
    float FPS = 24.0;
    float FPS_div_Frames = FPS / _numOfFrames;
    float timeInFrames = frac(_speed * _Time.y);

    timeInFrames = ceil(timeInFrames * _numOfFrames);
    timeInFrames /= _numOfFrames;

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

    //get position, normal and colour from textures
    float4 texturePos = SAMPLE_TEXTURE2D_LOD(_posTex, samplerPosTex,
        float2(uv2x, uv2y),0);
    float3 textureN = SAMPLE_TEXTURE2D_LOD(_nTex, samplerNTex,
        float2(uv2x, uv2y),0);
    float4 textureCd = SAMPLE_TEXTURE2D_LOD(_colorTex, samplerColorTex,
        float2(uv2x, uv2y),0);
    if (_doubleTex){
        float3 texturePos2 = SAMPLE_TEXTURE2D_LOD(_posTex2, samplerPosTex2,
        float2(uv2x, uv2y),0);
        texturePos.xyz += (texturePos2 * 0.01);
    }

    //expand normalised position texture values to world space
    float expand = _posMax - _posMin;
    texturePos.xyz *= expand;
    texturePos.xyz += _posMin;
    // texturePos.x *= -1;  //flipped to account for right-handedness of unity

    //create camera facing billboard based on uv coordinates
    float3 cameraF = float3(0.5 - uv.x, uv.y - 0.5, 0);
    cameraF *= float3(_width, _height, 1);
    cameraF = mul(cameraF, UNITY_MATRIX_MV);
    output.positionVAT = cameraF + texturePos.xyz;

    //set vertex colour
    output.colorVAT = textureCd;

    output.normalVAT = float3(1.0, 0.0, 0.0);

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

TEXTURE2D(_RampTex);            SAMPLER(sampler_RampTex);

half4 SampleRamp(float lookUpPos, TEXTURE2D_PARAM(RampTex, sampler_RampTex))
{
    half4 rampCd = half4(0.0h, 0.0h, 0.0h, 1.0h);
    rampCd = SAMPLE_TEXTURE2D(RampTex, sampler_RampTex, lookUpPos);

    return rampCd;
}
