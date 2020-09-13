// Copyright Epic Games, Inc. All Rights Reserved.

/**
 * MaterialTemplate.usf: Filled in by FHLSLMaterialTranslator::GetMaterialShaderCode for each material being compiled.
 */

#include "/Engine/Private/SceneTexturesCommon.ush"
#include "/Engine/Private/Random.ush"
#include "/Engine/Private/SobolRandom.ush"
#include "/Engine/Private/MonteCarlo.ush"
#include "/Engine/Generated/UniformBuffers/Material.ush"
#include "/Engine/Private/DepthOfFieldCommon.ush"
#include "/Engine/Private/CircleDOFCommon.ush"
#include "/Engine/Private/GlobalDistanceFieldShared.ush"
#include "/Engine/Private/SceneData.ush"
#include "/Engine/Private/HairShadingCommon.ush"

#if USES_SPEEDTREE
    #include "/Engine/Private/SpeedTreeCommon.ush"
#endif

//////////////////////////////////////////////////////////////////////////
//! Must match ESceneTextureId

#define PPI_SceneColor 0
#define PPI_SceneDepth 1
#define PPI_DiffuseColor 2
#define PPI_SpecularColor 3
#define PPI_SubsurfaceColor 4
#define PPI_BaseColor 5
#define PPI_Specular 6
#define PPI_Metallic 7
#define PPI_WorldNormal 8
#define PPI_SeparateTranslucency 9
#define PPI_Opacity 10
#define PPI_Roughness 11
#define PPI_MaterialAO 12
#define PPI_CustomDepth 13
#define PPI_PostProcessInput0 14
#define PPI_PostProcessInput1 15
#define PPI_PostProcessInput2 16
#define PPI_PostProcessInput3 17
#define PPI_PostProcessInput4 18
#define PPI_PostProcessInput5 19 // (UNUSED)
#define PPI_PostProcessInput6 20 // (UNUSED)
#define PPI_DecalMask 21
#define PPI_ShadingModelColor 22
#define PPI_ShadingModelID 23
#define PPI_AmbientOcclusion 24
#define PPI_CustomStencil 25
#define PPI_StoredBaseColor 26
#define PPI_StoredSpecular 27
#define PPI_Velocity 28
#define PPI_WorldTangent 29
#define PPI_Anisotropy 30

//////////////////////////////////////////////////////////////////////////

#define NUM_MATERIAL_TEXCOORDS_VERTEX 0
#define NUM_MATERIAL_TEXCOORDS 0
#define NUM_CUSTOM_VERTEX_INTERPOLATORS 0
#define NUM_TEX_COORD_INTERPOLATORS 0

// Vertex interpolators offsets definition


#if NUM_VIRTUALTEXTURE_SAMPLES || LIGHTMAP_VT_ENABLED
    #include "/Engine/Private/VirtualTextureCommon.ush"
#endif

#ifdef MIN_MATERIAL_TEXCOORDS
    #include "/Engine/Private/MinMaterialTexCoords.ush"
#endif

#if MATERIAL_ATMOSPHERIC_FOG
    #include "/Engine/Private/AtmosphereCommon.ush"
#endif

#if MATERIAL_SKY_ATMOSPHERE && PROJECT_SUPPORT_SKY_ATMOSPHERE
#include "/Engine/Private/SkyAtmosphereCommon.ush"
#endif

#include "/Engine/Private/PaniniProjection.ush"

#ifndef USE_DITHERED_LOD_TRANSITION
    #if USE_INSTANCING
        #ifndef USE_DITHERED_LOD_TRANSITION_FOR_INSTANCED
            #error "USE_DITHERED_LOD_TRANSITION_FOR_INSTANCED should have been defined"
        #endif
        #define USE_DITHERED_LOD_TRANSITION USE_DITHERED_LOD_TRANSITION_FOR_INSTANCED
    #else
        #ifndef USE_DITHERED_LOD_TRANSITION_FROM_MATERIAL
            #error "USE_DITHERED_LOD_TRANSITION_FROM_MATERIAL should have been defined"
        #endif
        #define USE_DITHERED_LOD_TRANSITION USE_DITHERED_LOD_TRANSITION_FROM_MATERIAL
    #endif
#endif

#ifndef USE_STENCIL_LOD_DITHER
    #define USE_STENCIL_LOD_DITHER    USE_STENCIL_LOD_DITHER_DEFAULT
#endif

//Platforms that don't run the editor shouldn't need editor features in the shaders.
#ifndef PLATFORM_SUPPORTS_EDITOR_SHADERS
#define PLATFORM_SUPPORTS_EDITOR_SHADERS !ESDEFERRED_PROFILE
#endif

//Tie Editor features to platform support and the COMPILE_SHADERS_FOR_DEVELOPMENT which is set via CVAR.
#define USE_EDITOR_SHADERS (PLATFORM_SUPPORTS_EDITOR_SHADERS && USE_DEVELOPMENT_SHADERS)

//Materials also have to opt in to these features.
#define USE_EDITOR_COMPOSITING (USE_EDITOR_SHADERS && EDITOR_PRIMITIVE_MATERIAL)

#define MATERIALBLENDING_ANY_TRANSLUCENT (MATERIALBLENDING_TRANSLUCENT || MATERIALBLENDING_ADDITIVE || MATERIALBLENDING_MODULATE)

#define IS_MESHPARTICLE_FACTORY (PARTICLE_MESH_FACTORY || NIAGARA_MESH_FACTORY)

/**
 * Parameters used by vertex and pixel shaders to access particle properties.
 */
struct FMaterialParticleParameters
{
    /** Relative time [0-1]. */
    half RelativeTime;
    /** Fade amount due to motion blur. */
    half MotionBlurFade;
    /** Random value per particle [0-1]. */
    half Random;
    /** XYZ: Direction, W: Speed. */
    half4 Velocity;
    /** Per-particle color. */
    half4 Color;
    /** Particle translated world space position and size(radius). */
    float4 TranslatedWorldPositionAndSize;
    /** Macro UV scale and bias. */
    half4 MacroUV;

    /** Dynamic parameters used by particle systems. */
#if NIAGARA_PARTICLE_FACTORY && (DYNAMIC_PARAMETERS_MASK != 0)
    uint DynamicParameterValidMask;
#endif
    half4 DynamicParameter;

#if( DYNAMIC_PARAMETERS_MASK & 2)
    half4 DynamicParameter1;
#endif

#if (DYNAMIC_PARAMETERS_MASK & 4)
    half4 DynamicParameter2;
#endif

#if (DYNAMIC_PARAMETERS_MASK & 8)
    half4 DynamicParameter3;
#endif

    /** mesh particle transform */
    float4x4 ParticleToWorld;

    /** Inverse mesh particle transform */
    float4x4 WorldToParticle;

#if USE_PARTICLE_SUBUVS
    /** SubUV texture coordinates*/
    MaterialFloat2 SubUVCoords[2];
    /** SubUV interpolation value*/
    MaterialFloat SubUVLerp;
#endif

    /** The size of the particle. */
    float2 Size;
};

float4 GetDynamicParameter(FMaterialParticleParameters Parameters, float4 Default, int ParameterIndex=0)
{
#if (NIAGARA_PARTICLE_FACTORY)
    switch ( ParameterIndex)
    {
    #if (DYNAMIC_PARAMETERS_MASK & 1)
        case 0:    return (Parameters.DynamicParameterValidMask & 1) != 0 ? Parameters.DynamicParameter : Default;
    #endif
    #if (DYNAMIC_PARAMETERS_MASK & 2)
        case 1:    return (Parameters.DynamicParameterValidMask & 2) != 0 ? Parameters.DynamicParameter1 : Default;
    #endif
    #if (DYNAMIC_PARAMETERS_MASK & 4)
        case 2:    return (Parameters.DynamicParameterValidMask & 4) != 0 ? Parameters.DynamicParameter2 : Default;
    #endif
    #if (DYNAMIC_PARAMETERS_MASK & 8)
        case 3:    return (Parameters.DynamicParameterValidMask & 8) != 0 ? Parameters.DynamicParameter3 : Default;
    #endif
        default: return Default;
    }
#elif (PARTICLE_FACTORY)
    return Parameters.DynamicParameter;
#endif
    return Default;

}

/**
 * Parameters calculated from the pixel material inputs.
 */
struct FPixelMaterialInputs
{
    MaterialFloat3 EmissiveColor;
    MaterialFloat Opacity;
    MaterialFloat OpacityMask;
    MaterialFloat3 BaseColor;
    MaterialFloat Metallic;
    MaterialFloat Specular;
    MaterialFloat Roughness;
    MaterialFloat Anisotropy;
    MaterialFloat3 Normal;
    MaterialFloat3 Tangent;
    MaterialFloat4 Subsurface;
    MaterialFloat AmbientOcclusion;
    MaterialFloat2 Refraction;
    MaterialFloat PixelDepthOffset;
    uint ShadingModel;

};

/**
 * Parameters needed by pixel shader material inputs, related to Geometry.
 * These are independent of vertex factory.
 */
struct FMaterialPixelParameters
{
#if NUM_TEX_COORD_INTERPOLATORS
    float2 TexCoords[NUM_TEX_COORD_INTERPOLATORS];
#endif

    /** Interpolated vertex color, in linear color space. */
    half4 VertexColor;

    /** Normalized world space normal. */
    half3 WorldNormal;

    /** Normalized world space tangent. */
    half3 WorldTangent;

    /** Normalized world space reflected camera vector. */
    half3 ReflectionVector;

    /** Normalized world space camera vector, which is the vector from the point being shaded to the camera position. */
    half3 CameraVector;

    /** World space light vector, only valid when rendering a light function. */
    half3 LightVector;

    /**
     * Like SV_Position (.xy is pixel position at pixel center, z:DeviceZ, .w:SceneDepth)
     * using shader generated value SV_POSITION
     * Note: this is not relative to the current viewport.  RelativePixelPosition = MaterialParameters.SvPosition.xy - View.ViewRectMin.xy;
     */
    float4 SvPosition;

    /** Post projection position reconstructed from SvPosition, before the divide by W. left..top -1..1, bottom..top -1..1  within the viewport, W is the SceneDepth */
    float4 ScreenPosition;

    half UnMirrored;

    half TwoSidedSign;

    /**
     * Orthonormal rotation-only transform from tangent space to world space
     * The transpose(TangentToWorld) is WorldToTangent, and TangentToWorld[2] is WorldVertexNormal
     */
    half3x3 TangentToWorld;

#if USE_WORLDVERTEXNORMAL_CENTER_INTERPOLATION
    /** World vertex normal interpolated at the pixel center that is safe to use for derivatives. */
    half3 WorldVertexNormal_Center;
#endif

    /**
     * Interpolated worldspace position of this pixel
     * todo: Make this TranslatedWorldPosition and also rename the VS/DS/HS WorldPosition to be TranslatedWorldPosition
     */
    float3 AbsoluteWorldPosition;

    /**
     * Interpolated worldspace position of this pixel, centered around the camera
     */
    float3 WorldPosition_CamRelative;

    /**
     * Interpolated worldspace position of this pixel, not including any world position offset or displacement.
     * Only valid if shader is compiled with NEEDS_WORLD_POSITION_EXCLUDING_SHADER_OFFSETS, otherwise just contains 0
     */
    float3 WorldPosition_NoOffsets;

    /**
     * Interpolated worldspace position of this pixel, not including any world position offset or displacement.
     * Only valid if shader is compiled with NEEDS_WORLD_POSITION_EXCLUDING_SHADER_OFFSETS, otherwise just contains 0
     */
    float3 WorldPosition_NoOffsets_CamRelative;

    /** Offset applied to the lighting position for translucency, used to break up aliasing artifacts. */
    half3 LightingPositionOffset;

    float AOMaterialMask;

#if LIGHTMAP_UV_ACCESS
    float2    LightmapUVs;
#endif

#if USE_INSTANCING
    half4 PerInstanceParams;
#endif

    // Index into View.PrimitiveSceneData
    uint PrimitiveId;

    // Actual primitive Id
#if VF_STRAND_HAIR
    uint    HairPrimitiveId;    // Control point ID
    float2    HairPrimitiveUV;    // U: parametric distance between the two surrounding control point. V: parametric distance along hair width
#endif

    /** Per-particle properties. Only valid for particle vertex factories. */
    FMaterialParticleParameters Particle;

#if ES3_1_PROFILE
    float4 LayerWeights;
#endif

#if TEX_COORD_SCALE_ANALYSIS
    /** Parameters used by the MaterialTexCoordScales shader. */
    FTexCoordScalesParams TexCoordScalesParams;
#endif

#if POST_PROCESS_MATERIAL && (FEATURE_LEVEL <= FEATURE_LEVEL_ES3_1)
    /** Used in mobile custom pp material to preserve original SceneColor Alpha */
    half BackupSceneColorAlpha;
#endif

#if COMPILER_HLSL
    // Workaround for "error X3067: 'GetObjectWorldPosition': ambiguous function call"
    // Which happens when FMaterialPixelParameters and FMaterialVertexParameters have the same number of floats with the HLSL compiler ver 9.29.952.3111
    // Function overload resolution appears to identify types based on how many floats / ints / etc they contain
    uint Dummy;
#endif

#if NUM_VIRTUALTEXTURE_SAMPLES || LIGHTMAP_VT_ENABLED
    FVirtualTextureFeedbackParams VirtualTextureFeedback;
#endif

#if WATER_MESH_FACTORY
    uint WaterWaveParamIndex;
#endif
};

// @todo compat hack
FMaterialPixelParameters MakeInitializedMaterialPixelParameters()
{
    FMaterialPixelParameters MPP;
    MPP = (FMaterialPixelParameters)0;
    MPP.TangentToWorld = float3x3(1,0,0,0,1,0,0,0,1);
    return MPP;
}

/**
 * Parameters needed by domain shader material inputs.
 * These are independent of vertex factory.
 */
struct FMaterialTessellationParameters
{
    // Note: Customized UVs are only evaluated in the vertex shader, which is not really what you want with tessellation, but keeps the code simpler
    // (tessellation texcoords are the same as pixels shader texcoords)
#if NUM_TEX_COORD_INTERPOLATORS
    float2 TexCoords[NUM_TEX_COORD_INTERPOLATORS];
#endif
    float4 VertexColor;
    // TODO: Non translated world position
    float3 WorldPosition;
    float3 TangentToWorldPreScale;

    // TangentToWorld[2] is WorldVertexNormal, [0] and [1] are binormal and tangent
    float3x3 TangentToWorld;

    // Index into View.PrimitiveSceneData
    uint PrimitiveId;
};

/**
 * Parameters needed by vertex shader material inputs.
 * These are independent of vertex factory.
 */
struct FMaterialVertexParameters
{
    // Position in the translated world (VertexFactoryGetWorldPosition).
    // Previous position in the translated world (VertexFactoryGetPreviousWorldPosition) if
    //    computing material's output for previous frame (See {BasePassVertex,Velocity}Shader.usf).
    float3 WorldPosition;
    // TangentToWorld[2] is WorldVertexNormal
    half3x3 TangentToWorld;
#if USE_INSTANCING
    /** Per-instance properties. */
    float4x4 InstanceLocalToWorld;
    float3 InstanceLocalPosition;
    float4 PerInstanceParams;
    uint InstanceId;

#elif IS_MESHPARTICLE_FACTORY
    /** Per-particle properties. */
    float4x4 InstanceLocalToWorld;
#endif
    // If either USE_INSTANCING or (IS_MESHPARTICLE_FACTORY && FEATURE_LEVEL >= FEATURE_LEVEL_SM4)
    // is true, PrevFrameLocalToWorld is a per-instance transform
    float4x4 PrevFrameLocalToWorld;

    float3 PreSkinnedPosition;
    float3 PreSkinnedNormal;

    half4 VertexColor;
#if NUM_MATERIAL_TEXCOORDS_VERTEX
    float2 TexCoords[NUM_MATERIAL_TEXCOORDS_VERTEX];
    #if ES3_1_PROFILE
    float2 TexCoordOffset; // Offset for UV localization for large UV values
    #endif
#endif

    /** Per-particle properties. Only valid for particle vertex factories. */
    FMaterialParticleParameters Particle;

    // Index into View.PrimitiveSceneData
    uint PrimitiveId;

#if WATER_MESH_FACTORY
    uint WaterWaveParamIndex;
#endif
};

/**
 * Returns the upper 3x3 portion of the LocalToWorld matrix.
 */
MaterialFloat3x3 GetLocalToWorld3x3(uint PrimitiveId)
{
    return (MaterialFloat3x3)GetPrimitiveData(PrimitiveId).LocalToWorld;
}

MaterialFloat3x3 GetLocalToWorld3x3()
{
    return (MaterialFloat3x3)Primitive.LocalToWorld;
}

float3 GetTranslatedWorldPosition(FMaterialVertexParameters Parameters)
{
    return Parameters.WorldPosition;
}

float3 GetPrevTranslatedWorldPosition(FMaterialVertexParameters Parameters)
{
    // Previous world position and current world position are sharing the
    // same attribute in Parameters, because in BasePassVertexShader.usf
    // and in VelocityShader.usf, we are regenerating a Parameters from
    // VertexFactoryGetPreviousWorldPosition() instead of
    // VertexFactoryGetWorldPosition().
    return GetTranslatedWorldPosition(Parameters);
}

float3 GetWorldPosition(FMaterialVertexParameters Parameters)
{
    return GetTranslatedWorldPosition(Parameters) - ResolvedView.PreViewTranslation;
}

float3 GetPrevWorldPosition(FMaterialVertexParameters Parameters)
{
    return GetPrevTranslatedWorldPosition(Parameters) - ResolvedView.PrevPreViewTranslation;
}

//TODO(bug UE-17131): We should compute world displacement for the previous frame
float3 GetWorldPosition(FMaterialTessellationParameters Parameters)
{
    return Parameters.WorldPosition;
}

float3 GetTranslatedWorldPosition(FMaterialTessellationParameters Parameters)
{
    return Parameters.WorldPosition + ResolvedView.PreViewTranslation;
}

float3 GetWorldPosition(FMaterialPixelParameters Parameters)
{
    return Parameters.AbsoluteWorldPosition;
}

float3 GetWorldPosition_NoMaterialOffsets(FMaterialPixelParameters Parameters)
{
    return Parameters.WorldPosition_NoOffsets;
}

float3 GetTranslatedWorldPosition(FMaterialPixelParameters Parameters)
{
    return Parameters.WorldPosition_CamRelative;
}

float3 GetTranslatedWorldPosition_NoMaterialOffsets(FMaterialPixelParameters Parameters)
{
    return Parameters.WorldPosition_NoOffsets_CamRelative;
}

float4 GetScreenPosition(FMaterialVertexParameters Parameters)
{
    return mul(float4(Parameters.WorldPosition, 1.0f), ResolvedView.TranslatedWorldToClip);
}

float4 GetScreenPosition(FMaterialPixelParameters Parameters)
{
    return Parameters.ScreenPosition;
}

float2 GetSceneTextureUV(FMaterialVertexParameters Parameters)
{
    return ScreenAlignedPosition(GetScreenPosition(Parameters));
}

float2 GetSceneTextureUV(FMaterialPixelParameters Parameters)
{
    return SvPositionToBufferUV(Parameters.SvPosition);
}

float2 GetViewportUV(FMaterialVertexParameters Parameters)
{
#if POST_PROCESS_MATERIAL
    return Parameters.WorldPosition.xy;
#else
    return BufferUVToViewportUV(GetSceneTextureUV(Parameters));
#endif
}

float2 GetPixelPosition(FMaterialVertexParameters Parameters)
{
    return GetViewportUV(Parameters) * View.ViewSizeAndInvSize.xy;
}


#if POST_PROCESS_MATERIAL

float2 GetPixelPosition(FMaterialPixelParameters Parameters)
{
    return Parameters.SvPosition.xy - float2(PostProcessOutput_ViewportMin);
}

float2 GetViewportUV(FMaterialPixelParameters Parameters)
{
    return GetPixelPosition(Parameters) * PostProcessOutput_ViewportSizeInverse;
}

#else

float2 GetPixelPosition(FMaterialPixelParameters Parameters)
{
    return Parameters.SvPosition.xy - float2(View.ViewRectMin.xy);
}

float2 GetViewportUV(FMaterialPixelParameters Parameters)
{
    return SvPositionToViewportUV(Parameters.SvPosition);
}

#endif

float GetWaterWaveParamIndex(FMaterialPixelParameters Parameters)
{
#if WATER_MESH_FACTORY
    return (float)Parameters.WaterWaveParamIndex;
#else
    return 0.0f;
#endif
}

float GetWaterWaveParamIndex(FMaterialVertexParameters Parameters)
{
#if WATER_MESH_FACTORY
    return (float)Parameters.WaterWaveParamIndex;
#else
    return 0.0f;
#endif
}

// Returns whether a scene texture id is a for a post process input or not.
bool IsPostProcessInputSceneTexture(const uint SceneTextureId)
{
    return (SceneTextureId >= PPI_PostProcessInput0 && SceneTextureId <= PPI_PostProcessInput6);
}

// Returns the view size and texel size in a given scene texture.
float4 GetSceneTextureViewSize(const uint SceneTextureId)
{
    #if POST_PROCESS_MATERIAL
    if (IsPostProcessInputSceneTexture(SceneTextureId))
    {
        switch (SceneTextureId)
        {
        case PPI_PostProcessInput0:
            return float4(PostProcessInput_0_ViewportSize, PostProcessInput_0_ViewportSizeInverse);
        case PPI_PostProcessInput1:
            return float4(PostProcessInput_1_ViewportSize, PostProcessInput_1_ViewportSizeInverse);
        case PPI_PostProcessInput2:
            return float4(PostProcessInput_2_ViewportSize, PostProcessInput_2_ViewportSizeInverse);
        case PPI_PostProcessInput3:
            return float4(PostProcessInput_3_ViewportSize, PostProcessInput_3_ViewportSizeInverse);
        case PPI_PostProcessInput4:
            return float4(PostProcessInput_4_ViewportSize, PostProcessInput_4_ViewportSizeInverse);
        default:
            return float4(0, 0, 0, 0);
        }
    }
    #endif
    return ResolvedView.ViewSizeAndInvSize;
}

// Return the buffer UV min and max for a given scene texture id.
float4 GetSceneTextureUVMinMax(const uint SceneTextureId)
{
    #if POST_PROCESS_MATERIAL
    if (IsPostProcessInputSceneTexture(SceneTextureId))
    {
        switch (SceneTextureId)
    {
        case PPI_PostProcessInput0:
            return float4(PostProcessInput_0_UVViewportBilinearMin, PostProcessInput_0_UVViewportBilinearMax);
        case PPI_PostProcessInput1:
            return float4(PostProcessInput_1_UVViewportBilinearMin, PostProcessInput_1_UVViewportBilinearMax);
        case PPI_PostProcessInput2:
            return float4(PostProcessInput_2_UVViewportBilinearMin, PostProcessInput_2_UVViewportBilinearMax);
        case PPI_PostProcessInput3:
            return float4(PostProcessInput_3_UVViewportBilinearMin, PostProcessInput_3_UVViewportBilinearMax);
        case PPI_PostProcessInput4:
            return float4(PostProcessInput_4_UVViewportBilinearMin, PostProcessInput_4_UVViewportBilinearMax);
        default:
            return float4(0, 0, 1, 1);
        }
    }
    #endif

    return View.BufferBilinearUVMinMax;
}

// Transforms viewport UV to scene texture's UV.
MaterialFloat2 ViewportUVToSceneTextureUV(MaterialFloat2 ViewportUV, const uint SceneTextureId)
{
    #if POST_PROCESS_MATERIAL
    if (IsPostProcessInputSceneTexture(SceneTextureId))
    {
        switch (SceneTextureId)
        {
        case PPI_PostProcessInput0:
            return ViewportUV * PostProcessInput_0_UVViewportSize + PostProcessInput_0_UVViewportMin;
        case PPI_PostProcessInput1:
            return ViewportUV * PostProcessInput_1_UVViewportSize + PostProcessInput_1_UVViewportMin;
        case PPI_PostProcessInput2:
            return ViewportUV * PostProcessInput_2_UVViewportSize + PostProcessInput_2_UVViewportMin;
        case PPI_PostProcessInput3:
            return ViewportUV * PostProcessInput_3_UVViewportSize + PostProcessInput_3_UVViewportMin;
        case PPI_PostProcessInput4:
            return ViewportUV * PostProcessInput_4_UVViewportSize + PostProcessInput_4_UVViewportMin;
        default:
            return ViewportUV;
        }
    }
    #endif

    return ViewportUVToBufferUV(ViewportUV);
}

// Manually clamp scene texture UV as if using a clamp sampler.
MaterialFloat2 ClampSceneTextureUV(MaterialFloat2 BufferUV, const uint SceneTextureId)
{
    float4 MinMax = GetSceneTextureUVMinMax(SceneTextureId);

    return clamp(BufferUV, MinMax.xy, MinMax.zw);
}

// Get default scene texture's UV.
MaterialFloat2 GetDefaultSceneTextureUV(FMaterialVertexParameters Parameters, const uint SceneTextureId)
{
    return GetSceneTextureUV(Parameters);
}

// Get default scene texture's UV.
MaterialFloat2 GetDefaultSceneTextureUV(FMaterialPixelParameters Parameters, const uint SceneTextureId)
{
    #if POST_PROCESS_MATERIAL
        return ViewportUVToSceneTextureUV(GetViewportUV(Parameters), SceneTextureId);
    #else
        return GetSceneTextureUV(Parameters);
    #endif
}


#if DECAL_PRIMITIVE && NUM_MATERIAL_TEXCOORDS
    /*
     * Material node DecalMipmapLevel's code designed to avoid the 2x2 pixels artefacts on the edges around where the decal
     * is projected to. The technique is fetched from (http://www.humus.name/index.php?page=3D&ID=84).
     *
     * The problem around edges of the meshes, is that the hardware computes the mipmap level according to ddx(uv) and ddy(uv),
     * but since the pixel shader are invocated by group of 2x2 pixels, then on edges some pixel might be getting the
     * current depth of an differet mesh that the other pixel of the same groups. If this mesh is very far from the other
     * mesh of the same group of pixel, then one of the delta might be very big, leading to choosing a low mipmap level for this
     * group of 4 pixels, causing the artefacts.
     */
    float2 ComputeDecalUVFromSvPosition(float4 SvPosition)
    {
        half DeviceZ = LookupDeviceZ(SvPositionToBufferUV(SvPosition));

        SvPosition.z = DeviceZ;

        float4 DecalVector = mul(float4(SvPosition.xyz,1), SvPositionToDecal);
        DecalVector.xyz /= DecalVector.w;
        DecalVector = DecalVector * 0.5f + 0.5f;
        DecalVector.xyz = DecalVector.zyx;
        return DecalVector.xy;
    }

    float2 ComputeDecalDDX(FMaterialPixelParameters Parameters)
    {
        /*
         * Assuming where in a pixel shader invocation, then we compute manualy compute two d(uv)/d(x)
         * with the pixels's left and right neighbours.
         */
        float4 ScreenDeltaX = float4(1, 0, 0, 0);
        float2 UvDiffX0 = Parameters.TexCoords[0] - ComputeDecalUVFromSvPosition(Parameters.SvPosition - ScreenDeltaX);
        float2 UvDiffX1 = ComputeDecalUVFromSvPosition(Parameters.SvPosition + ScreenDeltaX) - Parameters.TexCoords[0];

        /*
         * So we have two diff on the X axis, we want the one that has the smallest length
         * to avoid the 2x2 pixels mipmap artefacts on the edges.
         */
        return dot(UvDiffX0, UvDiffX0) < dot(UvDiffX1, UvDiffX1) ? UvDiffX0 : UvDiffX1;
    }

    float2 ComputeDecalDDY(FMaterialPixelParameters Parameters)
    {
        // do same for the Y axis
        float4 ScreenDeltaY = float4(0, 1, 0, 0);
        float2 UvDiffY0 = Parameters.TexCoords[0] - ComputeDecalUVFromSvPosition(Parameters.SvPosition - ScreenDeltaY);
        float2 UvDiffY1 = ComputeDecalUVFromSvPosition(Parameters.SvPosition + ScreenDeltaY) - Parameters.TexCoords[0];

        return dot(UvDiffY0, UvDiffY0) < dot(UvDiffY1, UvDiffY1) ? UvDiffY0 : UvDiffY1;
    }

    float ComputeDecalMipmapLevel(FMaterialPixelParameters Parameters, float2 TextureSize)
    {
        float2 UvPixelDiffX = ComputeDecalDDX(Parameters) * TextureSize;
        float2 UvPixelDiffY = ComputeDecalDDY(Parameters) * TextureSize;

        // Computes the mipmap level
        float MaxDiff = max(dot(UvPixelDiffX, UvPixelDiffX), dot(UvPixelDiffY, UvPixelDiffY));
        return 0.5 * log2(MaxDiff);
    }
#else // DECAL_PRIMITIVE && NUM_MATERIAL_TEXCOORDS
    float2 ComputeDecalDDX(FMaterialPixelParameters Parameters)
    {
        return 0.0f;
    }

    float2 ComputeDecalDDY(FMaterialPixelParameters Parameters)
    {
        return 0.0f;
    }

    float ComputeDecalMipmapLevel(FMaterialPixelParameters Parameters, float2 TextureSize)
    {
        return 0.0f;
    }
#endif // DECAL_PRIMITIVE && NUM_MATERIAL_TEXCOORDS

#if DECAL_PRIMITIVE
    /*
     * Deferred decal don't have a Primitive uniform buffer, because we don't know on which primitive the decal
     * is being projected to. But the user may still need to get the decal's actor world position.
     * So instead of setting up a primitive buffer that may cost to much CPU effort to be almost never used,
     * we directly fetch this value from the DeferredDecal.usf specific uniform variable DecalToWorld.
     */
    float3 GetActorWorldPosition(uint PrimitiveId)
    {
        return DecalToWorld[3].xyz;
    }

    float3 GetObjectOrientation(uint PrimitiveId)
    {
        return DecalOrientation.xyz;
    }
#else
    float3 GetActorWorldPosition(uint PrimitiveId)
    {
        return GetPrimitiveData(PrimitiveId).ActorWorldPosition;
    }

    float3 GetObjectOrientation(uint PrimitiveId)
    {
        return GetPrimitiveData(PrimitiveId).ObjectOrientation.xyz;
    }
#endif // DECAL_PRIMITIVE

#if DECAL_PRIMITIVE
    float DecalLifetimeOpacity()
    {
        return DecalParams.y;
    }
#else
    float DecalLifetimeOpacity()
    {
        return 0.0f;
    }
#endif // DECAL_PRIMITIVE

// Per Instance Custom Data Getter (Vertex Shader Only)
/** Get the per-instance custom data when instancing */
float GetPerInstanceCustomData(FMaterialVertexParameters Parameters, int Index, float DefaultValue)
{
#if USE_INSTANCING && USES_PER_INSTANCE_CUSTOM_DATA
    if(InstanceVF.NumCustomDataFloats > 0)
    {
        int BufferStartIndex = Parameters.InstanceId * InstanceVF.NumCustomDataFloats;
        int FloatIndex = clamp(Index, 0, InstanceVF.NumCustomDataFloats - 1);
        return InstanceVF.InstanceCustomDataBuffer[BufferStartIndex + FloatIndex];
    }
    else
    {
        return DefaultValue;
    }
#else
    return DefaultValue;
#endif
}

/** Transforms a vector from tangent space to world space, prescaling by an amount calculated previously */
MaterialFloat3 TransformTangentVectorToWorld_PreScaled(FMaterialTessellationParameters Parameters, MaterialFloat3 InTangentVector)
{
#if FEATURE_LEVEL >= FEATURE_LEVEL_SM5
    // used optionally to scale up the vector prior to conversion
    InTangentVector *= abs( Parameters.TangentToWorldPreScale );

    // Transform directly to world space
    // The vector transform is optimized for this case, only one vector-matrix multiply is needed
    return mul(InTangentVector, Parameters.TangentToWorld);
#else
    return TransformTangentVectorToWorld(Parameters.TangentToWorld, InTangentVector);
#endif // #if FEATURE_LEVEL_SM5
}

/** Transforms a vector from tangent space to view space */
MaterialFloat3 TransformTangentVectorToView(FMaterialPixelParameters Parameters, MaterialFloat3 InTangentVector)
{
    // Transform from tangent to world, and then to view space
    return mul(mul(InTangentVector, Parameters.TangentToWorld), (MaterialFloat3x3)ResolvedView.TranslatedWorldToView);
}

/** Transforms a vector from local space to world space (VS version) */
MaterialFloat3 TransformLocalVectorToWorld(FMaterialVertexParameters Parameters,MaterialFloat3 InLocalVector)
{
    #if USE_INSTANCING || IS_MESHPARTICLE_FACTORY
        return mul(InLocalVector, (MaterialFloat3x3)Parameters.InstanceLocalToWorld);
    #else
        return mul(InLocalVector, GetLocalToWorld3x3(Parameters.PrimitiveId));
    #endif
}

/** Transforms a vector from local space to world space (PS version) */
MaterialFloat3 TransformLocalVectorToWorld(FMaterialPixelParameters Parameters,MaterialFloat3 InLocalVector)
{
    return mul(InLocalVector, GetLocalToWorld3x3(Parameters.PrimitiveId));
}

/** Transforms a vector from local space to previous frame world space (VS version) */
MaterialFloat3 TransformLocalVectorToPrevWorld(FMaterialVertexParameters Parameters,MaterialFloat3 InLocalVector)
{
    return mul(InLocalVector, (MaterialFloat3x3)Parameters.PrevFrameLocalToWorld);
}

#if HAS_PRIMITIVE_UNIFORM_BUFFER

/** Transforms a position from local space to absolute world space */
float3 TransformLocalPositionToWorld(FMaterialPixelParameters Parameters,float3 InLocalPosition)
{
    return mul(float4(InLocalPosition, 1), GetPrimitiveData(Parameters.PrimitiveId).LocalToWorld).xyz;
}

/** Transforms a position from local space to absolute world space */
float3 TransformLocalPositionToWorld(FMaterialVertexParameters Parameters,float3 InLocalPosition)
{
    #if USE_INSTANCING || IS_MESHPARTICLE_FACTORY
        return mul(float4(InLocalPosition, 1), Parameters.InstanceLocalToWorld).xyz;
    #else
        return mul(float4(InLocalPosition, 1), GetPrimitiveData(Parameters.PrimitiveId).LocalToWorld).xyz;
    #endif
}

/** Transforms a position from local space to previous frame absolute world space */
float3 TransformLocalPositionToPrevWorld(FMaterialVertexParameters Parameters,float3 InLocalPosition)
{
    return mul(float4(InLocalPosition, 1), Parameters.PrevFrameLocalToWorld).xyz;
}

#endif

#if HAS_PRIMITIVE_UNIFORM_BUFFER

/** Return the object's position in world space */
float3 GetObjectWorldPosition(FMaterialPixelParameters Parameters)
{
    return GetPrimitiveData(Parameters.PrimitiveId).ObjectWorldPositionAndRadius.xyz;
}

float3 GetObjectWorldPosition(FMaterialTessellationParameters Parameters)
{
    return GetPrimitiveData(Parameters.PrimitiveId).ObjectWorldPositionAndRadius.xyz;
}

/** Return the object's position in world space. For instanced meshes, this returns the instance position. */
float3 GetObjectWorldPosition(FMaterialVertexParameters Parameters)
{
    #if USE_INSTANCING || IS_MESHPARTICLE_FACTORY
        return Parameters.InstanceLocalToWorld[3].xyz;
    #else
        return GetPrimitiveData(Parameters.PrimitiveId).ObjectWorldPositionAndRadius.xyz;
    #endif
}

#endif

/** Get the per-instance random value when instancing */
float GetPerInstanceRandom(FMaterialVertexParameters Parameters)
{
#if USE_INSTANCING
    return Parameters.PerInstanceParams.x;
#else
    return 0.0;
#endif
}

/** Get the per-instance random value when instancing */
float GetPerInstanceRandom(FMaterialPixelParameters Parameters)
{
#if USE_INSTANCING
    return Parameters.PerInstanceParams.x;
#else
    return 0.0;
#endif
}

/** Get the per-instance fade-out amount when instancing */
float GetPerInstanceFadeAmount(FMaterialPixelParameters Parameters)
{
#if USE_INSTANCING
    return float(Parameters.PerInstanceParams.y);
#else
    return float(1.0);
#endif
}

/** Get the per-instance fade-out amount when instancing */
float GetPerInstanceFadeAmount(FMaterialVertexParameters Parameters)
{
#if USE_INSTANCING
    return float(Parameters.PerInstanceParams.y);
#else
    return float(1.0);
#endif
}

MaterialFloat GetDistanceCullFade()
{
#if PIXELSHADER
    return saturate(ResolvedView.RealTime * PrimitiveFade.FadeTimeScaleBias.x + PrimitiveFade.FadeTimeScaleBias.y);
#else
    return 1.0f;
#endif
}

/** Rotates Position about the given axis by the given angle, in radians, and returns the offset to Position. */
float3 RotateAboutAxis(float4 NormalizedRotationAxisAndAngle, float3 PositionOnAxis, float3 Position)
{
    // Project Position onto the rotation axis and find the closest point on the axis to Position
    float3 ClosestPointOnAxis = PositionOnAxis + NormalizedRotationAxisAndAngle.xyz * dot(NormalizedRotationAxisAndAngle.xyz, Position - PositionOnAxis);
    // Construct orthogonal axes in the plane of the rotation
    float3 UAxis = Position - ClosestPointOnAxis;
    float3 VAxis = cross(NormalizedRotationAxisAndAngle.xyz, UAxis);
    float CosAngle;
    float SinAngle;
    sincos(NormalizedRotationAxisAndAngle.w, SinAngle, CosAngle);
    // Rotate using the orthogonal axes
    float3 R = UAxis * CosAngle + VAxis * SinAngle;
    // Reconstruct the rotated world space position
    float3 RotatedPosition = ClosestPointOnAxis + R;
    // Convert from position to a position offset
    return RotatedPosition - Position;
}

// Material Expression function
float MaterialExpressionDepthOfFieldFunction(float SceneDepth, int FunctionValueIndex)
{
    // tryed switch() but seems that doesn't work

    if(FunctionValueIndex == 0) // TDOF_NearAndFarMask
    {
        return CalcUnfocusedPercentCustomBound(SceneDepth, 1, 1);
    }
    else if(FunctionValueIndex == 1) // TDOF_Near
    {
        return CalcUnfocusedPercentCustomBound(SceneDepth, 1, 0);
    }
    else if(FunctionValueIndex == 2) // TDOF_Far
    {
        return CalcUnfocusedPercentCustomBound(SceneDepth, 0, 1);
    }
    else if(FunctionValueIndex == 3) // TDOF_CircleOfConfusionRadius
    {
        // * 2 to compensate for half res
        return DepthToCoc(SceneDepth) * 2.0f;
    }
    return 0;
}

// TODO convert to LUT
float3 MaterialExpressionBlackBody( float Temp )
{
    float u = ( 0.860117757f + 1.54118254e-4f * Temp + 1.28641212e-7f * Temp*Temp ) / ( 1.0f + 8.42420235e-4f * Temp + 7.08145163e-7f * Temp*Temp );
    float v = ( 0.317398726f + 4.22806245e-5f * Temp + 4.20481691e-8f * Temp*Temp ) / ( 1.0f - 2.89741816e-5f * Temp + 1.61456053e-7f * Temp*Temp );

    float x = 3*u / ( 2*u - 8*v + 4 );
    float y = 2*v / ( 2*u - 8*v + 4 );
    float z = 1 - x - y;

    float Y = 1;
    float X = Y/y * x;
    float Z = Y/y * z;

    float3x3 XYZtoRGB =
    {
         3.2404542, -1.5371385, -0.4985314,
        -0.9692660,  1.8760108,  0.0415560,
         0.0556434, -0.2040259,  1.0572252,
    };

    return mul( XYZtoRGB, float3( X, Y, Z ) ) * pow( 0.0004 * Temp, 4 );
}


#if VF_STRAND_HAIR
float2 GetHairStrandsRootUV(uint HairPrimitiveId, float2 VertexUV);
float2 GetHairStrandsUV(uint HairPrimitiveId, float2 VertexUV);
float2 GetHairStrandsDimensions(uint HairPrimitiveId, float2 VertexUV);
float  GetHairStrandsSeed(uint HairPrimitiveId, float2 VertexUV);
float  GetHairStrandsRoughness(uint HairPrimitiveId, float2 HairPrimitiveUV);
float3 GetHairStrandsBaseColor(uint HairPrimitiveId, float2 HairPrimitiveUV);
#endif

float2 MaterialExpressionGetHairRootUV(FMaterialPixelParameters Parameters)
{
#if VF_STRAND_HAIR
    return GetHairStrandsRootUV(Parameters.HairPrimitiveId, Parameters.HairPrimitiveUV);
#else
    return float2(0, 0);
#endif
}

float2 MaterialExpressionGetHairUV(FMaterialPixelParameters Parameters)
{
#if VF_STRAND_HAIR
    return GetHairStrandsUV(Parameters.HairPrimitiveId, Parameters.HairPrimitiveUV);
#else
    return float2(0,0);
#endif
}

float2 MaterialExpressionGetHairDimensions(FMaterialPixelParameters Parameters)
{
#if VF_STRAND_HAIR
    return GetHairStrandsDimensions(Parameters.HairPrimitiveId, Parameters.HairPrimitiveUV);
#else
    return float2(0, 0);
#endif
}

float MaterialExpressionGetHairSeed(FMaterialPixelParameters Parameters)
{
#if VF_STRAND_HAIR
    return GetHairStrandsSeed(Parameters.HairPrimitiveId, Parameters.HairPrimitiveUV);
#else
    return 0;
#endif
}

float3 MaterialExpressionGetHairBaseColor(FMaterialPixelParameters Parameters)
{
#if VF_STRAND_HAIR
    return GetHairStrandsBaseColor(Parameters.HairPrimitiveId, Parameters.HairPrimitiveUV);
#else
    return float3(0,0,0);
#endif
}

float MaterialExpressionGetHairRoughness(FMaterialPixelParameters Parameters)
{
#if VF_STRAND_HAIR
    return GetHairStrandsRoughness(Parameters.HairPrimitiveId, Parameters.HairPrimitiveUV);
#else
    return 0;
#endif
}
float3 MaterialExpressionGetHairTangent(FMaterialPixelParameters Parameters)
{
    return Parameters.TangentToWorld[2];
}

float3 MaterialExpressionGetHairColorFromMelanin(float Melanin, float Redness, float3 DyeColor)
{
    return GetHairColorFromMelanin(Melanin, Redness, DyeColor);
}

float4 MaterialExpressionAtmosphericFog(FMaterialPixelParameters Parameters, float3 AbsoluteWorldPosition)
{
#if MATERIAL_ATMOSPHERIC_FOG
    // WorldPosition default value is Parameters.AbsoluteWorldPosition if not overridden by the user
    float3 ViewVector = AbsoluteWorldPosition - ResolvedView.WorldCameraOrigin;
    float SceneDepth = length(ViewVector);
    return GetAtmosphericFog(ResolvedView.WorldCameraOrigin, ViewVector, SceneDepth, float3(0.f, 0.f, 0.f));
#else
    return float4(0.f, 0.f, 0.f, 0.f);
#endif
}

float3 MaterialExpressionAtmosphericLightVector(FMaterialPixelParameters Parameters)
{
#if MATERIAL_ATMOSPHERIC_FOG
    return ResolvedView.AtmosphereLightDirection[0].xyz;
#else
    return float3(0.f, 0.f, 0.f);
#endif
}

float3 MaterialExpressionAtmosphericLightColor(FMaterialPixelParameters Parameters)
{
#if MATERIAL_ATMOSPHERIC_FOG
    return ResolvedView.AtmosphereLightColor[0].rgb;
#else
    return float3(0.f, 0.f, 0.f);
#endif
}

float3 MaterialExpressionSkyAtmosphereLightIlluminance(FMaterialPixelParameters Parameters, float3 WorldPosition, uint LightIndex)
{
#if MATERIAL_SKY_ATMOSPHERE && PROJECT_SUPPORT_SKY_ATMOSPHERE
    const float3 PlanetCenterToWorldPos = (WorldPosition - ResolvedView.SkyPlanetCenterAndViewHeight.xyz) * CM_TO_SKY_UNIT;

    // GetAtmosphereTransmittance does a shadow test against the virtual planet.
    const float3 TransmittanceToLight = GetAtmosphereTransmittance(
        PlanetCenterToWorldPos, ResolvedView.AtmosphereLightDirection[LightIndex].xyz, ResolvedView.SkyAtmosphereBottomRadiusKm, ResolvedView.SkyAtmosphereTopRadiusKm,
        View.TransmittanceLutTexture, View.TransmittanceLutTextureSampler);

    return ResolvedView.AtmosphereLightColor[LightIndex].rgb * TransmittanceToLight;
#else
    return float3(0.0f, 0.0f, 0.0f);
#endif
}

float3 MaterialExpressionSkyAtmosphereLightDirection(FMaterialPixelParameters Parameters, uint LightIndex)
{
#if MATERIAL_SKY_ATMOSPHERE && PROJECT_SUPPORT_SKY_ATMOSPHERE
    return ResolvedView.AtmosphereLightDirection[LightIndex].xyz;
#else
    return float3(0.0f, 0.0f, 0.0f);
#endif
}

float3 MaterialExpressionSkyAtmosphereLightDiskLuminance(FMaterialPixelParameters Parameters, uint LightIndex)
{
    float3 LightDiskLuminance = float3(0.0f, 0.0f, 0.0f);
#if MATERIAL_SKY_ATMOSPHERE && PROJECT_SUPPORT_SKY_ATMOSPHERE
    if (ResolvedView.RenderingReflectionCaptureMask == 0.0f) // Do not render light disk when in reflection capture in order to avoid double specular. The sun contribution is already computed analyticaly.
    {
        const float3 PlanetCenterToWorldCameraPos = (ResolvedView.SkyWorldCameraOrigin - ResolvedView.SkyPlanetCenterAndViewHeight.xyz) * CM_TO_SKY_UNIT;
        const float ViewHeight = ResolvedView.SkyPlanetCenterAndViewHeight.w * CM_TO_SKY_UNIT;
        const float3 ViewDir = -Parameters.CameraVector;

        // GetLightDiskLuminance does a test against the virtual planet but SkyWorldCameraOrigin is always put safely setup above it (to never have the camera into the virtual planet with a black screen)
        LightDiskLuminance =  GetLightDiskLuminance(PlanetCenterToWorldCameraPos, ViewDir, ResolvedView.SkyAtmosphereBottomRadiusKm, ResolvedView.SkyAtmosphereTopRadiusKm,
            View.TransmittanceLutTexture, View.TransmittanceLutTextureSampler,
            ResolvedView.AtmosphereLightDirection[LightIndex].xyz, ResolvedView.AtmosphereLightDiscCosHalfApexAngle[LightIndex].x, ResolvedView.AtmosphereLightDiscLuminance[LightIndex].xyz);
    }
#endif
    return LightDiskLuminance;
}

float3 MaterialExpressionSkyAtmosphereViewLuminance(FMaterialPixelParameters Parameters)
{
#if MATERIAL_SKY_ATMOSPHERE && PROJECT_SUPPORT_SKY_ATMOSPHERE
    const float3 PlanetCenterToWorldCameraPos = (ResolvedView.SkyWorldCameraOrigin - ResolvedView.SkyPlanetCenterAndViewHeight.xyz) * CM_TO_SKY_UNIT;
    const float ViewHeight = ResolvedView.SkyPlanetCenterAndViewHeight.w * CM_TO_SKY_UNIT;
    const float3 ViewDir = -Parameters.CameraVector;

    // The referencial used to build the Sky View lut
    float3x3 LocalReferencial = GetSkyViewLutReferential(PlanetCenterToWorldCameraPos, ResolvedView.ViewForward, ResolvedView.ViewRight);
    // Compute inputs in this referential
    float3 WorldPosLocal = float3(0.0, 0.0, ViewHeight);
    float3 UpVectorLocal = float3(0.0, 0.0, 1.0);
    float3 WorldDirLocal = mul(ViewDir, LocalReferencial);
    float ViewZenithCosAngle = dot(WorldDirLocal, UpVectorLocal);

    float2 Sol = RayIntersectSphere(WorldPosLocal, WorldDirLocal, float4(0.0f, 0.0f, 0.0f, ResolvedView.SkyAtmosphereBottomRadiusKm));
    const bool IntersectGround = any(Sol > 0.0f);

    float2 SkyViewLutUv;
    SkyViewLutParamsToUv(IntersectGround, ViewZenithCosAngle, WorldDirLocal, ViewHeight, ResolvedView.SkyAtmosphereBottomRadiusKm, ResolvedView.SkyViewLutSizeAndInvSize, SkyViewLutUv);
    float3 SkyAtmosphereViewLuminance = Texture2DSampleLevel(View.SkyViewLutTexture, View.SkyViewLutTextureSampler, SkyViewLutUv, 0.0f).rgb;
    SkyAtmosphereViewLuminance *= ResolvedView.SkyAtmosphereSkyLuminanceFactor;
#if USE_PREEXPOSURE
    SkyAtmosphereViewLuminance *= ResolvedView.OneOverPreExposure;
#endif
    return SkyAtmosphereViewLuminance;
#else
    return float3(0.0f, 0.0f, 0.0f);
#endif
}

float4 MaterialExpressionSkyAtmosphereAerialPerspective(FMaterialPixelParameters Parameters, float3 WorldPosition)
{
#if MATERIAL_SKY_ATMOSPHERE && PROJECT_SUPPORT_SKY_ATMOSPHERE
    const float OneOverPreExposure = USE_PREEXPOSURE ? ResolvedView.OneOverPreExposure : 1.0f;

    const float3 WorldPos = WorldPosition * CM_TO_SKY_UNIT;
    const float3 CameraPos = ResolvedView.SkyWorldCameraOrigin.xyz*CM_TO_SKY_UNIT;

    // NDCPosition is not computed using WorldPosition because it could result in position outside the frustum,
    // distorted uvs and bad visuals with artefact. Only the distance computation can actually be benefit from the surface position specified here.
    float4 NDCPosition = mul(float4(Parameters.AbsoluteWorldPosition.xyz, 1), ResolvedView.WorldToClip);

    float4 FogToApplyOver = 1.0f;
    float4 AerialPerspective = GetAerialPerspectiveLuminanceTransmittance(
        NDCPosition, WorldPos, CameraPos,
        View.CameraAerialPerspectiveVolume, View.CameraAerialPerspectiveVolumeSampler,
        ResolvedView.SkyAtmosphereCameraAerialPerspectiveVolumeDepthResolutionInv,
        ResolvedView.SkyAtmosphereCameraAerialPerspectiveVolumeDepthResolution,
        ResolvedView.SkyAtmosphereAerialPerspectiveStartDepthKm,
        ResolvedView.SkyAtmosphereCameraAerialPerspectiveVolumeDepthSliceLengthKm,
        ResolvedView.SkyAtmosphereCameraAerialPerspectiveVolumeDepthSliceLengthKmInv,
        OneOverPreExposure);
    return AerialPerspective;
#else
    return float4(0.0f, 0.0f, 0.0f, 1.0f); // RGB= null scattering, A= null transmittance
#endif
}

float3 MaterialExpressionSkyAtmosphereDistantLightScatteredLuminance(FMaterialPixelParameters Parameters)
{
#if MATERIAL_SKY_ATMOSPHERE && PROJECT_SUPPORT_SKY_ATMOSPHERE
    // TODO load on platforms supporting it
    return Texture2DSampleLevel(View.DistantSkyLightLutTexture, View.DistantSkyLightLutTextureSampler, float2(0.5f, 0.5f), 0.0f).rgb;
#else
    return float3(0.0f, 0.0f, 0.0f);
#endif
}

/**
 * Utility function to unmirror one coordinate value to the other side
 * UnMirrored == 1 if normal
 * UnMirrored == -1 if mirrored
 *
 * Used by most of parameter functions generated via code in this file
 */
MaterialFloat UnMirror( MaterialFloat Coordinate, FMaterialPixelParameters Parameters )
{
    return ((Coordinate)*(Parameters.UnMirrored)*0.5+0.5);
}

/**
 * UnMirror only U
 */
MaterialFloat2 UnMirrorU( MaterialFloat2 UV, FMaterialPixelParameters Parameters )
{
    return MaterialFloat2(UnMirror(UV.x, Parameters), UV.y);
}

/**
 * UnMirror only V
 */
MaterialFloat2 UnMirrorV( MaterialFloat2 UV, FMaterialPixelParameters Parameters )
{
    return MaterialFloat2(UV.x, UnMirror(UV.y, Parameters));
}

/**
 * UnMirror only UV
 */
MaterialFloat2 UnMirrorUV( MaterialFloat2 UV, FMaterialPixelParameters Parameters )
{
    return MaterialFloat2(UnMirror(UV.x, Parameters), UnMirror(UV.y, Parameters));
}

/**
 * Transforms screen space positions into UVs with [.5, .5] centered on ObjectPostProjectionPosition,
 * And [1, 1] at ObjectPostProjectionPosition + (ObjectRadius, ObjectRadius).
 */
MaterialFloat2 GetParticleMacroUV(FMaterialPixelParameters Parameters)
{
    return (Parameters.ScreenPosition.xy / Parameters.ScreenPosition.w - Parameters.Particle.MacroUV.xy) * Parameters.Particle.MacroUV.zw + MaterialFloat2(.5, .5);
}

MaterialFloat4 ProcessMaterialColorTextureLookup(MaterialFloat4 TextureValue)
{
    return TextureValue;
}

MaterialFloat4 ProcessMaterialExternalTextureLookup(MaterialFloat4 TextureValue)
{
#if COMPILER_GLSL_ES3_1
    return MaterialFloat4(pow(TextureValue.rgb, 2.2f), TextureValue.a);
#else
    return ProcessMaterialColorTextureLookup(TextureValue);
#endif
}

MaterialFloat4 ProcessMaterialLinearColorTextureLookup(MaterialFloat4 TextureValue)
{
    return TextureValue;
}

MaterialFloat ProcessMaterialGreyscaleTextureLookup(MaterialFloat TextureValue)
{
#if (COMPILER_GLSL_ES3_1 || VULKAN_PROFILE) // OpenGLES3.1, Vulkan3.1 do not support sRGB sampling from R8
    #if MOBILE_EMULATION
    if( ResolvedView.MobilePreviewMode > 0.5f )
    {
        // undo HW srgb->lin
        TextureValue = pow(TextureValue, 1.0f/2.2f); // TODO: replace with a more accurate lin -> sRGB conversion.
    }
    #endif
    // sRGB read approximation (in highp if possible)
    float LinValue = TextureValue;
    LinValue *= LinValue;
    return MaterialFloat(LinValue);
#endif
    return TextureValue;
}

MaterialFloat ProcessMaterialLinearGreyscaleTextureLookup(MaterialFloat TextureValue)
{
    return TextureValue;
}

/** Accesses a shared material sampler or falls back if independent samplers are not supported. */
SamplerState GetMaterialSharedSampler(SamplerState TextureSampler, SamplerState SharedSampler)
{
#if SUPPORTS_INDEPENDENT_SAMPLERS
    return SharedSampler;
#else
    // Note: to match behavior on platforms that don't support SUPPORTS_INDEPENDENT_SAMPLERS,
    // TextureSampler should have been set to the same sampler.  This is not currently done.
    return TextureSampler;
#endif
}

/** Calculate a reflection vector about the specified world space normal. Optionally normalize this normal **/
MaterialFloat3 ReflectionAboutCustomWorldNormal(FMaterialPixelParameters Parameters, MaterialFloat3 WorldNormal, bool bNormalizeInputNormal)
{
    if (bNormalizeInputNormal)
    {
        WorldNormal = normalize(WorldNormal);
    }

    return -Parameters.CameraVector + WorldNormal * dot(WorldNormal, Parameters.CameraVector) * 2.0;
}

#ifndef SPHERICAL_OPACITY_FOR_SHADOW_DEPTHS
#define SPHERICAL_OPACITY_FOR_SHADOW_DEPTHS 0
#endif

/**
 * Calculates opacity for a billboard particle as if it were a sphere.
 * Note: Calling this function requires the vertex factory to have been compiled with SPHERICAL_PARTICLE_OPACITY set to 1
 */
float GetSphericalParticleOpacity(FMaterialPixelParameters Parameters, float Density)
{
    float Opacity = 0;

#if PARTICLE_FACTORY || HAS_PRIMITIVE_UNIFORM_BUFFER

#if PARTICLE_FACTORY

    float3 ParticleTranslatedWorldPosition = Parameters.Particle.TranslatedWorldPositionAndSize.xyz;
    float ParticleRadius = max(0.000001f, Parameters.Particle.TranslatedWorldPositionAndSize.w);

#elif HAS_PRIMITIVE_UNIFORM_BUFFER

    // Substitute object attributes if the mesh is not a particle
    // This is mostly useful for previewing materials using spherical opacity in the material editor
    float3 ParticleTranslatedWorldPosition = GetPrimitiveData(Parameters.PrimitiveId).ObjectWorldPositionAndRadius.xyz + ResolvedView.PreViewTranslation.xyz;
    float ParticleRadius = max(0.000001f, GetPrimitiveData(Parameters.PrimitiveId).ObjectWorldPositionAndRadius.w);

#endif

    // Rescale density to make the final opacity independent of the particle radius
    float RescaledDensity = Density / ParticleRadius;

    // Distance from point being shaded to particle center
    float DistanceToParticle = length(Parameters.WorldPosition_NoOffsets_CamRelative - ParticleTranslatedWorldPosition);

    FLATTEN
    if (DistanceToParticle < ParticleRadius)
    {
        // Distance from point being shaded to the point on the sphere along the view direction
        float HemisphericalDistance = sqrt(ParticleRadius * ParticleRadius - DistanceToParticle * DistanceToParticle);

#if SPHERICAL_OPACITY_FOR_SHADOW_DEPTHS
        // When rendering shadow depths we can't use scene depth or the near plane, just use the distance through the whole sphere
        float DistanceThroughSphere = HemisphericalDistance * 2;
#else
        // Initialize near and far sphere intersection distances
        float NearDistance = Parameters.ScreenPosition.w - HemisphericalDistance;
        float FarDistance = Parameters.ScreenPosition.w + HemisphericalDistance;

        float SceneDepth = CalcSceneDepth(SvPositionToBufferUV(Parameters.SvPosition));
        FarDistance = min(SceneDepth, FarDistance);

        // Take into account opaque objects intersecting the sphere
        float DistanceThroughSphere = FarDistance - NearDistance;
#endif

        // Use the approximation for the extinction line integral from "Spherical Billboards and their Application to Rendering Explosions"
        Opacity = saturate(1 - exp2(-RescaledDensity * (1 - DistanceToParticle / ParticleRadius) * DistanceThroughSphere));

#if !SPHERICAL_OPACITY_FOR_SHADOW_DEPTHS
        // Fade out as the particle approaches the near plane
        Opacity = lerp(0, Opacity, saturate((Parameters.ScreenPosition.w - ParticleRadius - ResolvedView.NearPlane) / ParticleRadius));
#endif
    }

#endif

    return Opacity;
}

float2 RotateScaleOffsetTexCoords(float2 InTexCoords, float4 InRotationScale, float2 InOffset)
{
    return float2(dot(InTexCoords, InRotationScale.xy), dot(InTexCoords, InRotationScale.zw)) + InOffset;
}

#if USES_SPEEDTREE

/** Vertex offset for SpeedTree wind and LOD */
float3 GetSpeedTreeVertexOffsetInner(FMaterialVertexParameters Parameters, int GeometryType, int WindType, int LODType, float BillboardThreshold, bool bExtraBend, float3 ExtraBend, FSpeedTreeData STData)
{
    #if (NUM_MATERIAL_TEXCOORDS_VERTEX < 6) || IS_MESHPARTICLE_FACTORY
        return float4(0,0,0);
    #endif

    #if USE_INSTANCING
        float3x3 LocalToWorld = (float3x3)Parameters.InstanceLocalToWorld;
        float3 LocalPosition = Parameters.InstanceLocalPosition;

        // skip if this instance is hidden
        if (Parameters.PerInstanceParams.z < 1.f)
        {
            return float3(0,0,0);
        }
    #else
        float3x3 LocalToWorld = (float3x3)GetPrimitiveData(Parameters.PrimitiveId).LocalToWorld;
        float3 LocalPosition = mul(float4(GetWorldPosition(Parameters), 1), GetPrimitiveData(Parameters.PrimitiveId).WorldToLocal).xyz;
    #endif

    float3 TreePos = GetObjectWorldPosition(Parameters);

    // compute LOD by finding screen space size
    float LodInterp = 1.0;
#if !USE_INSTANCING || !USE_DITHERED_LOD_TRANSITION
    if (LODType == SPEEDTREE_LOD_TYPE_SMOOTH)
    {
        const float Dist = length(TreePos - ResolvedView.WorldCameraOrigin);
        const float ScreenMultiple = 0.5 * max(ResolvedView.ViewToClip[0][0], ResolvedView.ViewToClip[1][1]);
        const float ScreenRadius = 2.0 * ScreenMultiple * GetPrimitiveData(Parameters.PrimitiveId).ObjectWorldPositionAndRadius.w / max(1.0, Dist);
        LodInterp = saturate((ScreenRadius - SpeedTreeLODInfo.x) / SpeedTreeLODInfo.z);
    }
#endif
    TreePos *= 0.001; // The only other use of the tree position is as an offset into trig functions, but big numbers don't play nice there

    // SpeedTrees should only be uniformly scaled, but if necessary, it takes a few more instructions
    float TreeScale = length(mul(float3(0,0,1), LocalToWorld));
                    //float3(length((float3)LocalToWorld[0]),
                    //        length((float3)LocalToWorld[1]),
                    //        length((float3)LocalToWorld[2]));


    // @todo There is probably a more optimal way to get the rotated (but not translated or scaled) vertex position needed for correct wind
    float3 OriginalPosition = LocalPosition;
    OriginalPosition = mul(OriginalPosition, LocalToWorld) / TreeScale;

    float3 FinalPosition = OriginalPosition;

    if (GeometryType == SPEEDTREE_GEOMETRY_TYPE_BILLBOARD)
    {
        if (BillboardThreshold < 1.0)
        {
            // billboard meshes can have triangles drop out if they aren't facing the camera
            // this rotates the view direction around so we ignore the local Z component
            float3 LocalView2D = normalize(float3(ResolvedView.ViewForward.xy, 0));
            float3 LocalNormal2D = normalize(float3(Parameters.TangentToWorld[2].xy, 0));
            if (dot(LocalView2D, LocalNormal2D) > (-1.0 + BillboardThreshold * 0.25))
            {
                FinalPosition = float3(0,0,0);
            }
        }
    }
    else
    {
        // rotated normal needed in a few places
        float3 Normal = Parameters.TangentToWorld[2];

        // branches and fronds
        if (GeometryType == SPEEDTREE_GEOMETRY_TYPE_BRANCH || GeometryType == SPEEDTREE_GEOMETRY_TYPE_FROND)
        {
            // smooth LOD
            #if !USE_INSTANCING
                if (LODType == SPEEDTREE_LOD_TYPE_SMOOTH)
                {
                    float3 LODPos = float3(Parameters.TexCoords[3].x, Parameters.TexCoords[3].y, Parameters.TexCoords[4].x);
                    LODPos = mul(LODPos, LocalToWorld) / TreeScale;
                    FinalPosition = lerp(LODPos, FinalPosition, LodInterp);
                }
            #endif

            // frond wind, if needed
            if (GeometryType == SPEEDTREE_GEOMETRY_TYPE_FROND && WindType == SPEEDTREE_WIND_TYPE_PALM)
            {
                float2 TexCoords = Parameters.TexCoords[0];
                float4 WindExtra = float4(Parameters.TexCoords[5].x, Parameters.TexCoords[5].y, Parameters.TexCoords[6].x, 0.0);
                FinalPosition = RippleFrond(STData, FinalPosition, Normal, TexCoords.x, TexCoords.y, WindExtra.x, WindExtra.y, WindExtra.z);
            }
        }

        // leaves and facing leaves
        if (GeometryType == SPEEDTREE_GEOMETRY_TYPE_FACINGLEAF ||
                (GeometryType == SPEEDTREE_GEOMETRY_TYPE_LEAF &&
                (LODType == SPEEDTREE_LOD_TYPE_SMOOTH || (WindType > SPEEDTREE_WIND_TYPE_FASTEST && WindType != SPEEDTREE_WIND_TYPE_PALM))))
        {
            // remove anchor pos from vertex position
            float3 Anchor = float3(Parameters.TexCoords[4].y, Parameters.TexCoords[5].x, Parameters.TexCoords[5].y);

            // face camera-facing leaves to the camera, if needed
            if (GeometryType == SPEEDTREE_GEOMETRY_TYPE_FACINGLEAF)
            {
                // have to rotate the view into local space
                FinalPosition = LocalPosition - Anchor;
                FinalPosition = FinalPosition.x * ResolvedView.ViewRight +
                                FinalPosition.y * ResolvedView.ViewUp +
                                FinalPosition.z * ResolvedView.ViewForward;
            }

            Anchor = (mul(Anchor, LocalToWorld)) / TreeScale;

            if (GeometryType == SPEEDTREE_GEOMETRY_TYPE_LEAF)
            {
                FinalPosition -= Anchor;
            }

            // smooth LOD
            #if !USE_INSTANCING
                if (LODType == SPEEDTREE_LOD_TYPE_SMOOTH)
                {
                    if (GeometryType == SPEEDTREE_GEOMETRY_TYPE_LEAF)
                    {
                        float3 LODPos = float3(Parameters.TexCoords[3].x, Parameters.TexCoords[3].y, Parameters.TexCoords[4].x);
                        LODPos = mul(LODPos, LocalToWorld) / TreeScale - Anchor;
                        FinalPosition = lerp(LODPos, FinalPosition, LodInterp);
                    }
                    else
                    {
                        float LODScalar = Parameters.TexCoords[3].x;
                        FinalPosition *= lerp(LODScalar, 1.0, LodInterp);
                    }
                }
            #endif

            // leaf wind
            if (WindType > SPEEDTREE_WIND_TYPE_FASTEST && WindType != SPEEDTREE_WIND_TYPE_PALM)
            {
                float4 WindExtra = float4(Parameters.TexCoords[6].x, Parameters.TexCoords[6].y, Parameters.TexCoords[7].x, Parameters.TexCoords[7].y);
                float LeafWindTrigOffset = Anchor.x + Anchor.y;
                FinalPosition = LeafWind(STData, WindExtra.w > 0.0, FinalPosition, Normal, WindExtra.x, float3(0,0,0), WindExtra.y, WindExtra.z, LeafWindTrigOffset, WindType);
            }

            // move leaf back to anchor
            FinalPosition += Anchor;
        }

        if (WindType > SPEEDTREE_WIND_TYPE_FAST)
        {
            // branch wind (applies to all geometry)
            float2 VertBranchWind = Parameters.TexCoords[2];
            FinalPosition = BranchWind(STData, FinalPosition, TreePos, float4(VertBranchWind, 0, 0), WindType);
        }
    }

    // global wind can apply to the whole tree, even billboards
    bool bHasGlobal = (WindType != SPEEDTREE_WIND_TYPE_NONE);
    if (bExtraBend || bHasGlobal)
    {
        FinalPosition = GlobalWind(STData, FinalPosition, TreePos, true, bHasGlobal, bExtraBend, ExtraBend);
    }

    // convert into a world space offset
    return (FinalPosition - OriginalPosition) * TreeScale;
}

/** Vertex offset for SpeedTree wind and LOD */
float3 GetSpeedTreeVertexOffset(FMaterialVertexParameters Parameters, int GeometryType, int WindType, int LODType, float BillboardThreshold, bool bUsePreviousFrame, bool bExtraBend, float3 ExtraBend)
{
#if VF_SUPPORTS_SPEEDTREE_WIND
    if (bUsePreviousFrame)
    {
        return GetSpeedTreeVertexOffsetInner(Parameters, GeometryType, WindType, LODType, BillboardThreshold, bExtraBend, ExtraBend, GetPreviousSpeedTreeData());
    }
    return GetSpeedTreeVertexOffsetInner(Parameters, GeometryType, WindType, LODType, BillboardThreshold, bExtraBend, ExtraBend, GetCurrentSpeedTreeData());
#else
    return 0;
#endif
}

#endif

MaterialFloat2 GetLightmapUVs(FMaterialPixelParameters Parameters)
{
#if LIGHTMAP_UV_ACCESS
    return Parameters.LightmapUVs;
#else
    return MaterialFloat2(0,0);
#endif
}

#if USES_EYE_ADAPTATION

// Allow passes to reroute which uniform buffer struct EyeAdaptation comes from
#ifndef EyeAdaptationStruct
    #if FEATURE_LEVEL >= FEATURE_LEVEL_SM5
        #define EyeAdaptationStruct SceneTexturesStruct
    #else
        #define EyeAdaptationStruct MobileSceneTextures
    #endif
#endif

//Provides access to the EyeAdaptation RT.
float EyeAdaptationLookup()
{
#if EYE_ADAPTATION_DISABLED || SCENE_TEXTURES_DISABLED
    return 0.0;
#elif FEATURE_LEVEL >= FEATURE_LEVEL_SM5
    return EyeAdaptationStruct.EyeAdaptation.Load(int3(0, 0, 0)).x;
#else
    return EyeAdaptationStruct.EyeAdaptationBuffer[0].x;
#endif
}
#endif

//The post-process material needs to decode the scene color since it's encoded at PreTonemapMSAA if MSAA enabled on MetalMobilePlatorm
//The POST_PROCESS_MATERIAL_BEFORE_TONEMAP is 1 for both BL_BeforeTranslucency and BL_BeforeTonemapping post-process materials
#if FEATURE_LEVEL <= FEATURE_LEVEL_ES3_1 && POST_PROCESS_MATERIAL && POST_PROCESS_MATERIAL_BEFORE_TONEMAP && METAL_PROFILE
uint bMetalMSAAHDRDecode;
#endif

#if NEEDS_SCENE_TEXTURES

#if SHADING_PATH_MOBILE

MaterialFloat4 MobileSceneTextureLookup(inout FMaterialPixelParameters Parameters, int SceneTextureId, float2 UV)
{
#if (FEATURE_LEVEL <= FEATURE_LEVEL_ES3_1)

    if (SceneTextureId == PPI_SceneDepth)
    {
        MaterialFloat Depth = Texture2DSample(MobileSceneTextures.SceneColorTexture, MobileSceneTextures.SceneColorTextureSampler, UV).a;
        return MaterialFloat4(Depth.rrr, 0.f);
    }
    else if (SceneTextureId == PPI_CustomDepth)
    {
        MaterialFloat Depth = Texture2DSample(MobileSceneTextures.CustomDepthTexture, MobileSceneTextures.CustomDepthTextureSampler, UV).r;
        return MaterialFloat4(Depth.rrr, 0.f);
    }
    else if (SceneTextureId == PPI_PostProcessInput0)
    {
#if POST_PROCESS_MATERIAL
        MaterialFloat4 Input0 = Texture2DSample(PostProcessInput_0_Texture, PostProcessInput_0_SharedSampler, UV);
        #if POST_PROCESS_MATERIAL_BEFORE_TONEMAP
            #if METAL_PROFILE
                // Decode the input color since the color is encoded for MSAA
                // The decode instructions might be able to skip with dynamic branch
                if (bMetalMSAAHDRDecode)
                {
                    Input0.rgb = Input0.rgb * rcp(Input0.r*(-0.299) + Input0.g*(-0.587) + Input0.b*(-0.114) + 1.0);
                }
            #endif
        #endif
        // We need to preserve original SceneColor Alpha as it's used by tonemapper on mobile
        Parameters.BackupSceneColorAlpha = Input0.a;
        return Input0;
#endif// POST_PROCESS_MATERIAL
    }
    else if (SceneTextureId == PPI_CustomStencil)
    {
        MaterialFloat Stencil = Texture2DSample(MobileSceneTextures.MobileCustomStencilTexture, MobileSceneTextures.MobileCustomStencilTextureSampler, UV).r*255.0;
        Stencil = floor(Stencil + 0.5);
        return MaterialFloat4(Stencil.rrr, 0.f);
    }
#endif// FEATURE_LEVEL

    return MaterialFloat4(0.0f, 0.0f, 0.0f, 0.0f);
}

#endif // SHADING_PATH_MOBILE

#if SHADING_PATH_DEFERRED

#include "/Engine/Private/DeferredShadingCommon.ush"        // GetGBufferData()


#if POST_PROCESS_MATERIAL
/** Samples the screen-space velocity for the specified UV coordinates. */
float2 PostProcessVelocityLookup(float Depth, float2 UV)
{
#if GBUFFER_HAS_VELOCITY
    float2 Velocity = Texture2DSampleLevel(SceneTexturesStruct.GBufferVelocityTexture, SceneTexturesStruct.GBufferVelocityTextureSampler, UV, 0).xy;
#else
    float2 Velocity = Texture2DSample(PostProcessInput_4_Texture, PostProcessInput_4_SharedSampler, UV).xy;
#endif

    if( Velocity.x > 0.0 )
    {
        Velocity = DecodeVelocityFromTexture(Velocity);
    }
    else
    {
        float4 ThisClip = float4( UV, Depth, 1 );
        float4 PrevClip = mul( ThisClip, View.ClipToPrevClip );
        float2 PrevScreen = PrevClip.xy / PrevClip.w;
        Velocity = UV - PrevScreen;
    }

    return Velocity;
}
#endif

/** Applies an offset to the scene texture lookup and decodes the HDR linear space color. */
float4 SceneTextureLookup(float2 UV, int SceneTextureIndex, bool bFiltered)
{
#if SCENE_TEXTURES_DISABLED
    return float4(0.0f, 0.0f, 0.0f, 0.0f);
#endif

    FScreenSpaceData ScreenSpaceData = GetScreenSpaceData(UV, false);
    switch(SceneTextureIndex)
    {
        // order needs to match to ESceneTextureId

        case PPI_SceneColor:
            return float4(CalcSceneColor(UV), 0);
        case PPI_SceneDepth:
            return ScreenSpaceData.GBuffer.Depth;
        case PPI_DiffuseColor:
            return float4(ScreenSpaceData.GBuffer.DiffuseColor, 0);
        case PPI_SpecularColor:
            return float4(ScreenSpaceData.GBuffer.SpecularColor, 0);
        case PPI_SubsurfaceColor:
            return IsSubsurfaceModel(ScreenSpaceData.GBuffer.ShadingModelID) ? float4( ExtractSubsurfaceColor(ScreenSpaceData.GBuffer), ScreenSpaceData.GBuffer.CustomData.a ) : ScreenSpaceData.GBuffer.CustomData;
        case PPI_BaseColor:
            return float4(ScreenSpaceData.GBuffer.BaseColor, 0);
        case PPI_Specular:
            return ScreenSpaceData.GBuffer.Specular;
        case PPI_Metallic:
            return ScreenSpaceData.GBuffer.Metallic;
        case PPI_WorldNormal:
            return float4(ScreenSpaceData.GBuffer.WorldNormal, 0);
        case PPI_SeparateTranslucency:
            return float4(1, 1, 1, 1);    // todo
        case PPI_Opacity:
            return ScreenSpaceData.GBuffer.CustomData.a;
        case PPI_Roughness:
            return ScreenSpaceData.GBuffer.Roughness;
        case PPI_MaterialAO:
            return ScreenSpaceData.GBuffer.GBufferAO;
        case PPI_CustomDepth:
            return ScreenSpaceData.GBuffer.CustomDepth;
#if POST_PROCESS_MATERIAL
        case PPI_PostProcessInput0:
            return Texture2DSample(PostProcessInput_0_Texture, bFiltered ? PostProcessInput_BilinearSampler : PostProcessInput_0_SharedSampler, UV);
        case PPI_PostProcessInput1:
            return Texture2DSample(PostProcessInput_1_Texture, bFiltered ? PostProcessInput_BilinearSampler : PostProcessInput_1_SharedSampler, UV);
        case PPI_PostProcessInput2:
            return Texture2DSample(PostProcessInput_2_Texture, bFiltered ? PostProcessInput_BilinearSampler : PostProcessInput_2_SharedSampler, UV);
        case PPI_PostProcessInput3:
            return Texture2DSample(PostProcessInput_3_Texture, bFiltered ? PostProcessInput_BilinearSampler : PostProcessInput_3_SharedSampler, UV);
        case PPI_PostProcessInput4:
            return Texture2DSample(PostProcessInput_4_Texture, bFiltered ? PostProcessInput_BilinearSampler : PostProcessInput_4_SharedSampler, UV);
#endif // __POST_PROCESS_COMMON__
        case PPI_DecalMask:
            return 0;  // material compiler will return an error
        case PPI_ShadingModelColor:
            return float4(GetShadingModelColor(ScreenSpaceData.GBuffer.ShadingModelID), 1);
        case PPI_ShadingModelID:
            return float4(ScreenSpaceData.GBuffer.ShadingModelID, 0, 0, 0);
        case PPI_AmbientOcclusion:
            return ScreenSpaceData.AmbientOcclusion;
        case PPI_CustomStencil:
            return ScreenSpaceData.GBuffer.CustomStencil;
        case PPI_StoredBaseColor:
            return float4(ScreenSpaceData.GBuffer.StoredBaseColor, 0);
        case PPI_StoredSpecular:
            return float4(ScreenSpaceData.GBuffer.StoredSpecular.rrr, 0);
#if POST_PROCESS_MATERIAL
        case PPI_Velocity:
            return float4(PostProcessVelocityLookup(ScreenSpaceData.GBuffer.Depth, UV), 0, 0);
#endif
        case PPI_WorldTangent:
            return float4(ScreenSpaceData.GBuffer.WorldTangent, 0);
        case PPI_Anisotropy:
            return ScreenSpaceData.GBuffer.Anisotropy;
        default:
            return float4(0, 0, 0, 0);
    }
}

#endif // SHADING_PATH_DEFERRED
#endif // NEEDS_SCENE_TEXTURES

#if SHADING_PATH_DEFERRED

/** Applies an offset to the scene texture lookup and decodes the HDR linear space color. */
float3 DecodeSceneColorForMaterialNode(float2 ScreenUV)
{
#if SCENE_TEXTURES_DISABLED
    // Hit proxies rendering pass doesn't have access to valid render buffers
    return float3(0.0f, 0.0f, 0.0f);
#else
    float4 EncodedSceneColor = Texture2DSample(SceneTexturesStruct.SceneColorCopyTexture, SceneTexturesStruct.SceneColorCopyTextureSampler, ScreenUV);

    // Undo the function in EncodeSceneColorForMaterialNode
    float3 SampledColor = pow(EncodedSceneColor.rgb, 4) * 10;

#if USE_PREEXPOSURE
    SampledColor *= View.OneOverPreExposure.xxx;
#endif

    return SampledColor;
#endif
}

#endif // SHADING_PATH_DEFERRED

// Uniform material expressions.


// can return in tangent space or world space (use MATERIAL_TANGENTSPACENORMAL)
half3 GetMaterialNormalRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.Normal;
}

half3 GetMaterialNormal(FMaterialPixelParameters Parameters, FPixelMaterialInputs PixelMaterialInputs)
{
    half3 RetNormal;

    RetNormal = GetMaterialNormalRaw(PixelMaterialInputs);

    #if (USE_EDITOR_SHADERS && !(ES3_1_PROFILE || ESDEFERRED_PROFILE)) || MOBILE_EMULATION
    {
        // this feature is only needed for development/editor - we can compile it out for a shipping build (see r.CompileShadersForDevelopment cvar help)
        half3 OverrideNormal = ResolvedView.NormalOverrideParameter.xyz;

        #if !MATERIAL_TANGENTSPACENORMAL
            OverrideNormal = Parameters.TangentToWorld[2] * (1 - ResolvedView.NormalOverrideParameter.w);
        #endif

        RetNormal = RetNormal * ResolvedView.NormalOverrideParameter.w + OverrideNormal;
    }
    #endif

    return RetNormal;
}

half3 GetMaterialTangentRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.Tangent;
}

half3 GetMaterialTangent(FPixelMaterialInputs PixelMaterialInputs)
{
    return GetMaterialTangentRaw(PixelMaterialInputs);
}

half3 GetMaterialEmissiveRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.EmissiveColor;
}

half3 GetMaterialEmissive(FPixelMaterialInputs PixelMaterialInputs)
{
    half3 EmissiveColor = GetMaterialEmissiveRaw(PixelMaterialInputs);
#if !MATERIAL_ALLOW_NEGATIVE_EMISSIVECOLOR
    EmissiveColor = max(EmissiveColor, 0.0f);
#endif
    return EmissiveColor;
}

half3 GetMaterialEmissiveForCS(FMaterialPixelParameters Parameters)
{
return 0;
}

// Shading Model is an uint and represents a SHADINGMODELID_* in ShadingCommon.ush
uint GetMaterialShadingModel(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.ShadingModel;
}

half3 GetMaterialBaseColorRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.BaseColor;
}

half3 GetMaterialBaseColor(FPixelMaterialInputs PixelMaterialInputs)
{
    return saturate(GetMaterialBaseColorRaw(PixelMaterialInputs));
}

half GetMaterialMetallicRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.Metallic;
}

half GetMaterialMetallic(FPixelMaterialInputs PixelMaterialInputs)
{
    return saturate(GetMaterialMetallicRaw(PixelMaterialInputs));
}

half GetMaterialSpecularRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.Specular;
}

half GetMaterialSpecular(FPixelMaterialInputs PixelMaterialInputs)
{
    return saturate(GetMaterialSpecularRaw(PixelMaterialInputs));
}

half GetMaterialRoughnessRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.Roughness;
}

half GetMaterialRoughness(FPixelMaterialInputs PixelMaterialInputs)
{
#if MATERIAL_FULLY_ROUGH
    return 1;
#endif
    half Roughness = saturate(GetMaterialRoughnessRaw(PixelMaterialInputs));

    #if (USE_EDITOR_SHADERS && !ESDEFERRED_PROFILE) || MOBILE_EMULATION
    {
        // this feature is only needed for development/editor - we can compile it out for a shipping build (see r.CompileShadersForDevelopment cvar help)
        Roughness = Roughness * ResolvedView.RoughnessOverrideParameter.y + ResolvedView.RoughnessOverrideParameter.x;
    }
    #endif

    return Roughness;
}

half GetMaterialAnisotropyRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.Anisotropy;
}

half GetMaterialAnisotropy(FPixelMaterialInputs PixelMaterialInputs)
{
    return clamp(GetMaterialAnisotropyRaw(PixelMaterialInputs), -1.0f, 1.0f);
}

half GetMaterialTranslucencyDirectionalLightingIntensity()
{
return 1.00000;
}

half GetMaterialTranslucentShadowDensityScale()
{
return 0.50000;
}

half GetMaterialTranslucentSelfShadowDensityScale()
{
return 2.00000;
}

half GetMaterialTranslucentSelfShadowSecondDensityScale()
{
return 10.00000;
}

half GetMaterialTranslucentSelfShadowSecondOpacity()
{
return 0.00000;
}

half GetMaterialTranslucentBackscatteringExponent()
{
return 30.00000;
}

half3 GetMaterialTranslucentMultipleScatteringExtinction()
{
return MaterialFloat3(1.00000, 0.83300, 0.58800);
}

// This is the clip value constant that is defined in the material (range 0..1)
// Use GetMaterialMask() to get the Material Mask combined with this.
half GetMaterialOpacityMaskClipValue()
{
return 0.33330;
}

// Should only be used by GetMaterialOpacity(), returns the unmodified value generated from the shader expressions of the opacity input.
// To compute the opacity depending on the material blending GetMaterialOpacity() should be called instead.
half GetMaterialOpacityRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.Opacity;
}

#if MATERIALBLENDING_MASKED || (DECAL_BLEND_MODE == DECALBLENDMODEID_VOLUMETRIC)
// Returns the material mask value generated from the material expressions.
// Use GetMaterialMask() to get the value altered depending on the material blend mode.
half GetMaterialMaskInputRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.OpacityMask;
}

// Returns the material mask value generated from the material expressions minus the used defined
// MaskClip value constant. If this value is <=0 the pixel should be killed.
half GetMaterialMask(FPixelMaterialInputs PixelMaterialInputs)
{
    return GetMaterialMaskInputRaw(PixelMaterialInputs) - GetMaterialOpacityMaskClipValue();
}
#endif

// Returns the material opacity depending on the material blend mode.
half GetMaterialOpacity(FPixelMaterialInputs PixelMaterialInputs)
{
    // Clamp to valid range to prevent negative colors from lerping
    return saturate(GetMaterialOpacityRaw(PixelMaterialInputs));
}

#if TRANSLUCENT_SHADOW_WITH_MASKED_OPACITY
half GetMaterialMaskedOpacity(FPixelMaterialInputs PixelMaterialInputs)
{
    return GetMaterialOpacity(PixelMaterialInputs) - GetMaterialOpacityMaskClipValue();
}
#endif

float3 GetMaterialWorldPositionOffset(FMaterialVertexParameters Parameters)
{
    #if USE_INSTANCING
        // skip if this instance is hidden
        if (Parameters.PerInstanceParams.z < 1.f)
        {
            return float3(0,0,0);
        }
    #endif
    return MaterialFloat3(0.00000000,0.00000000,0.00000000);;
}

float3 GetMaterialPreviousWorldPositionOffset(FMaterialVertexParameters Parameters)
{
    #if USE_INSTANCING
        // skip if this instance is hidden
        if (Parameters.PerInstanceParams.z < 1.f)
        {
            return float3(0,0,0);
        }
    #endif
    return MaterialFloat3(0.00000000,0.00000000,0.00000000);;
}

half3 GetMaterialWorldDisplacement(FMaterialTessellationParameters Parameters)
{
    return MaterialFloat3(0.00000000,0.00000000,0.00000000);;
}

half GetMaterialMaxDisplacement()
{
return 0.00000;
}

half GetMaterialTessellationMultiplier(FMaterialTessellationParameters Parameters)
{
    return 1.00000000;;
}

// .rgb:SubsurfaceColor, .a:SSProfileId in 0..1 range
half4 GetMaterialSubsurfaceDataRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.Subsurface;
}

half4 GetMaterialSubsurfaceData(FPixelMaterialInputs PixelMaterialInputs)
{
    half4 OutSubsurface = GetMaterialSubsurfaceDataRaw(PixelMaterialInputs);
    OutSubsurface.rgb = saturate(OutSubsurface.rgb);
    return OutSubsurface;
}

half GetMaterialCustomData0(FMaterialPixelParameters Parameters)
{
    return 1.00000000;;
}

half GetMaterialCustomData1(FMaterialPixelParameters Parameters)
{
    return 0.10000000;;
}

half GetMaterialAmbientOcclusionRaw(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.AmbientOcclusion;
}

half GetMaterialAmbientOcclusion(FPixelMaterialInputs PixelMaterialInputs)
{
    return saturate(GetMaterialAmbientOcclusionRaw(PixelMaterialInputs));
}

half2 GetMaterialRefraction(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.Refraction;
}

#if NUM_TEX_COORD_INTERPOLATORS
void GetMaterialCustomizedUVs(FMaterialVertexParameters Parameters, inout float2 OutTexCoords[NUM_TEX_COORD_INTERPOLATORS])
{

}

void GetCustomInterpolators(FMaterialVertexParameters Parameters, inout float2 OutTexCoords[NUM_TEX_COORD_INTERPOLATORS])
{

}
#endif

float GetMaterialPixelDepthOffset(FPixelMaterialInputs PixelMaterialInputs)
{
    return PixelMaterialInputs.PixelDepthOffset;
}

#if DECAL_PRIMITIVE

float3 TransformTangentNormalToWorld(MaterialFloat3x3 TangentToWorld, float3 TangentNormal)
{
    // To transform the normals use tranpose(Inverse(DecalToWorld)) = transpose(WorldToDecal)
    // But we want to only rotate the normals (we don't want to non-uniformaly scale them).
    // We assume the matrix is only a scale and rotation, and we remove non-uniform scale:
    float3 lengthSqr = { length2(DecalToWorld._m00_m01_m02),
                            length2(DecalToWorld._m10_m11_m12),
                            length2(DecalToWorld._m20_m21_m22) };

    float3 scale = rsqrt(lengthSqr);

    // Pre-multiply by the inverse of the non-uniform scale in DecalToWorld
    float4 ScaledNormal = float4(-TangentNormal.z * scale.x, TangentNormal.y * scale.y, TangentNormal.x * scale.z, 0.f);

    // Compute the normal
    return normalize(mul(ScaledNormal, DecalToWorld).xyz);
}

#else //DECAL_PRIMITIVE

float3 TransformTangentNormalToWorld(MaterialFloat3x3 TangentToWorld, float3 TangentNormal)
{
    return normalize(float3(TransformTangentVectorToWorld(TangentToWorld, TangentNormal)));
}

#endif //DECAL_PRIMITIVE

void CalcPixelMaterialInputs(in out FMaterialPixelParameters Parameters, in out FPixelMaterialInputs PixelMaterialInputs)
{
    // Initial calculations (required for Normal)

    // The Normal is a special case as it might have its own expressions and also be used to calculate other inputs, so perform the assignment here
    PixelMaterialInputs.Normal = MaterialFloat3(0.00000000,0.00000000,1.00000000);


    // Note that here MaterialNormal can be in world space or tangent space
    float3 MaterialNormal = GetMaterialNormal(Parameters, PixelMaterialInputs);

#if MATERIAL_TANGENTSPACENORMAL
#if SIMPLE_FORWARD_SHADING
    Parameters.WorldNormal = float3(0, 0, 1);
#endif

#if FEATURE_LEVEL >= FEATURE_LEVEL_SM4
    // ES2 will rely on only the final normalize for performance
    MaterialNormal = normalize(MaterialNormal);
#endif

    // normalizing after the tangent space to world space conversion improves quality with sheared bases (UV layout to WS causes shrearing)
    // use full precision normalize to avoid overflows
    Parameters.WorldNormal = TransformTangentNormalToWorld(Parameters.TangentToWorld, MaterialNormal);

#else //MATERIAL_TANGENTSPACENORMAL

    Parameters.WorldNormal = normalize(MaterialNormal);

#endif //MATERIAL_TANGENTSPACENORMAL

#if MATERIAL_TANGENTSPACENORMAL
    // flip the normal for backfaces being rendered with a two-sided material
    Parameters.WorldNormal *= Parameters.TwoSidedSign;
#endif

    Parameters.ReflectionVector = ReflectionAboutCustomWorldNormal(Parameters, Parameters.WorldNormal, false);

#if !PARTICLE_SPRITE_FACTORY
    Parameters.Particle.MotionBlurFade = 1.0f;
#endif // !PARTICLE_SPRITE_FACTORY

    // Now the rest of the inputs
    MaterialFloat3 Local0 = lerp(MaterialFloat3(0.00000000,0.00000000,0.00000000),Material.VectorExpressions[1].rgb,MaterialFloat(Material.ScalarExpressions[0].x));

    PixelMaterialInputs.EmissiveColor = Local0;
    PixelMaterialInputs.Opacity = 1.00000000;
    PixelMaterialInputs.OpacityMask = 1.00000000;
    PixelMaterialInputs.BaseColor = MaterialFloat3(0.00000000,0.00000000,0.00000000);
    PixelMaterialInputs.Metallic = 0.00000000;
    PixelMaterialInputs.Specular = 0.50000000;
    PixelMaterialInputs.Roughness = 0.50000000;
    PixelMaterialInputs.Anisotropy = 0.00000000;
    PixelMaterialInputs.Tangent = MaterialFloat3(1.00000000,0.00000000,0.00000000);
    PixelMaterialInputs.Subsurface = 0;
    PixelMaterialInputs.AmbientOcclusion = 1.00000000;
    PixelMaterialInputs.Refraction = 0;
    PixelMaterialInputs.PixelDepthOffset = 0.00000000;
    PixelMaterialInputs.ShadingModel = 0;


#if GBUFFER_HAS_TANGENT
    #if MATERIAL_TANGENTSPACENORMAL

        #if SIMPLE_FORWARD_SHADING
            Parameters.WorldTangent = float3(1, 0, 0);
        #endif

            float3 MaterialTangent = GetMaterialTangent(PixelMaterialInputs);

        #if FEATURE_LEVEL >= FEATURE_LEVEL_SM4
            MaterialTangent = normalize(MaterialTangent);
        #endif

        Parameters.WorldTangent = TransformTangentNormalToWorld(Parameters.TangentToWorld, MaterialTangent);

        // flip the tangent for backfaces being rendered with a two-sided material
        Parameters.WorldTangent *= Parameters.TwoSidedSign;

    #else //MATERIAL_TANGENTSPACENORMAL
        Parameters.WorldTangent = normalize(GetMaterialTangent(PixelMaterialInputs));
    #endif //MATERIAL_TANGENTSPACENORMAL
#else
    Parameters.WorldTangent = 0;
#endif
}

// Programmatically set the line number after all the material inputs which have a variable number of line endings
// This allows shader error line numbers after this point to be the same regardless of which material is being compiled
#line 2239

void ClipLODTransition(float2 SvPosition, float DitherFactor)
{
    if (abs(DitherFactor) > .001)
    {
        float ArgCos = dot(floor(SvPosition.xy), float2(347.83451793, 3343.28371963));
#if FEATURE_LEVEL <= FEATURE_LEVEL_ES3_1
        // Temporary workaround for precision issues on mobile when the argument is bigger than 10k
        ArgCos = fmod(ArgCos, 10000);
#endif
        float RandCos = cos(ArgCos);
        float RandomVal = frac(RandCos * 1000.0);
        half RetVal = (DitherFactor < 0.0) ?
            (DitherFactor + 1.0 > RandomVal) :
            (DitherFactor < RandomVal);
        clip(RetVal - .001);
    }
}

void ClipLODTransition(FMaterialPixelParameters Parameters, float DitherFactor)
{
    ClipLODTransition(Parameters.SvPosition.xy, DitherFactor);
}


#define REQUIRES_VF_ATTRIBUTES_FOR_CLIPPING (USE_INSTANCING && USE_DITHERED_LOD_TRANSITION)

#if USE_INSTANCING && USE_DITHERED_LOD_TRANSITION
void ClipLODTransition(FMaterialPixelParameters Parameters)
{
    ClipLODTransition(Parameters, Parameters.PerInstanceParams.w);
}
#elif USE_DITHERED_LOD_TRANSITION && !USE_STENCIL_LOD_DITHER
void ClipLODTransition(FMaterialPixelParameters Parameters)
{
    if (PrimitiveDither.LODFactor != 0.0)
    {
        ClipLODTransition(Parameters, PrimitiveDither.LODFactor);
    }
}
void ClipLODTransition(float2 SvPosition)
{
    if (PrimitiveDither.LODFactor != 0.0)
    {
        ClipLODTransition(SvPosition, PrimitiveDither.LODFactor);
    }
}
#else
void ClipLODTransition(FMaterialPixelParameters Parameters)
{
}
void ClipLODTransition(float2 SvPosition)
{
}
#endif

void GetMaterialClippingShadowDepth(FMaterialPixelParameters Parameters, FPixelMaterialInputs PixelMaterialInputs)
{
    ClipLODTransition(Parameters);
    #if MATERIALBLENDING_MASKED
        clip(GetMaterialMask(PixelMaterialInputs));
    #elif TRANSLUCENT_SHADOW_WITH_MASKED_OPACITY
        clip(GetMaterialMaskedOpacity(PixelMaterialInputs));
    #elif MATERIALBLENDING_TRANSLUCENT
        clip(GetMaterialOpacity(PixelMaterialInputs) - 1.0f / 255.0f);
    #endif
}

void GetMaterialClippingVelocity(FMaterialPixelParameters Parameters, FPixelMaterialInputs PixelMaterialInputs)
{
    ClipLODTransition(Parameters);
    #if MATERIALBLENDING_MASKED && MATERIAL_DITHER_OPACITY_MASK
        clip(GetMaterialMaskInputRaw(PixelMaterialInputs) - 1.0f / 255.0f);
    #elif MATERIALBLENDING_MASKED
        clip(GetMaterialMask(PixelMaterialInputs));
    #elif MATERIALBLENDING_TRANSLUCENT || MATERIALBLENDING_ADDITIVE || MATERIALBLENDING_MODULATE
        clip(GetMaterialOpacity(PixelMaterialInputs) - 1.0 / 255.0 - GetMaterialOpacityMaskClipValue());
    #endif
}


void GetMaterialCoverageAndClipping(FMaterialPixelParameters Parameters, FPixelMaterialInputs PixelMaterialInputs)
{
    ClipLODTransition(Parameters);

#if MATERIALBLENDING_MASKED
    #if MATERIAL_DITHER_OPACITY_MASK
        /*
        5 value dither. Every value present in +
        012
        234
        401
        */
        float2 Pos = Parameters.SvPosition.xy;

        float2 DepthGrad = {
            ddx( Parameters.SvPosition.z ),
            ddy( Parameters.SvPosition.z )
        };
        //Pos = floor( Pos + DepthGrad * float2( 4093, 3571 ) );

        float Dither5 = frac( ( Pos.x + Pos.y * 2 - 1.5 + ResolvedView.TemporalAAParams.x ) / 5 );
        float Noise = frac( dot( float2( 171.0, 231.0 ) / 71, Pos.xy ) );
        float Dither = ( Dither5 * 5 + Noise ) * (1.0 / 6.0);

        clip( GetMaterialMask(PixelMaterialInputs) + Dither - 0.5 );
    #else
        clip(GetMaterialMask(PixelMaterialInputs));
    #endif
#endif
}

#define MATERIALBLENDING_MASKED_USING_COVERAGE (FORWARD_SHADING && MATERIALBLENDING_MASKED && SUPPORTS_PIXEL_COVERAGE)
#if MATERIALBLENDING_MASKED_USING_COVERAGE

uint GetDerivativeCoverageFromMask(float MaterialMask)
{
    uint Coverage = 0x0;
    if (MaterialMask > 0.01) Coverage = 0x8;
    if (MaterialMask > 0.25) Coverage = 0x9;
    if (MaterialMask > 0.50) Coverage = 0xD;
    if (MaterialMask > 0.75) Coverage = 0xF;
    return Coverage;
}

// Returns the new pixel coverage according the material's mask and the current pixel's mask.
uint DiscardMaterialWithPixelCoverage(FMaterialPixelParameters MaterialParameters, FPixelMaterialInputs PixelMaterialInputs)
{
    ClipLODTransition(MaterialParameters);
    float OriginalMask = GetMaterialMaskInputRaw(PixelMaterialInputs);
    float MaskClip = GetMaterialOpacityMaskClipValue();

    if (ResolvedView.NumSceneColorMSAASamples > 1)
    {
        float Mask = (OriginalMask - MaskClip) / (1.0 - MaskClip);
        uint CurrentPixelCoverage = GetDerivativeCoverageFromMask(Mask);
        // Discard pixel shader if all sample are masked to avoid computing other material inputs.
        clip(float(CurrentPixelCoverage) - 0.5);
        return CurrentPixelCoverage;
    }
    clip(OriginalMask - MaskClip);
    return 0xF;
}

#endif // MATERIALBLENDING_MASKED_USING_COVERAGE


    #define FrontFaceSemantic SV_IsFrontFace
    #define FIsFrontFace bool
    half GetFloatFacingSign(FIsFrontFace bIsFrontFace)
    {
        return bIsFrontFace ? +1 : -1;
    }

#if MATERIAL_TWOSIDED_SEPARATE_PASS
    #define OPTIONAL_IsFrontFace
    static const FIsFrontFace bIsFrontFace = 1;
#else
    #define OPTIONAL_IsFrontFace , in FIsFrontFace bIsFrontFace : FrontFaceSemantic
#endif

/** Initializes the subset of Parameters that was not set in GetMaterialPixelParameters. */
void CalcMaterialParametersEx(
    in out FMaterialPixelParameters Parameters,
    in out FPixelMaterialInputs PixelMaterialInputs,
    float4 SvPosition,
    float4 ScreenPosition,
    FIsFrontFace bIsFrontFace,
    float3 TranslatedWorldPosition,
    float3 TranslatedWorldPositionExcludingShaderOffsets)
{
    // Remove the pre view translation
    Parameters.WorldPosition_CamRelative = TranslatedWorldPosition.xyz;
    Parameters.AbsoluteWorldPosition = TranslatedWorldPosition.xyz - ResolvedView.PreViewTranslation.xyz;

    // If the material uses any non-offset world position expressions, calculate those parameters. If not,
    // the variables will have been initialised to 0 earlier.
#if USE_WORLD_POSITION_EXCLUDING_SHADER_OFFSETS
    Parameters.WorldPosition_NoOffsets_CamRelative = TranslatedWorldPositionExcludingShaderOffsets;
    Parameters.WorldPosition_NoOffsets = TranslatedWorldPositionExcludingShaderOffsets - ResolvedView.PreViewTranslation.xyz;
#endif

    Parameters.SvPosition = SvPosition;
    Parameters.ScreenPosition = ScreenPosition;

    #if !RAYHITGROUPSHADER
        // TranslatedWorldPosition is the world position translated to the camera position, which is just -CameraVector
        Parameters.CameraVector = normalize(-Parameters.WorldPosition_CamRelative.xyz);
    #else
        Parameters.CameraVector = -WorldRayDirection();
    #endif

    Parameters.LightVector = 0;

    Parameters.TwoSidedSign = 1.0f;

#if MATERIAL_TWOSIDED && HAS_PRIMITIVE_UNIFORM_BUFFER
    // #dxr: DirectX Raytracing's HitKind() intrinsic already accounts for negative scaling
    #if PIXELSHADER
        Parameters.TwoSidedSign *= ResolvedView.CullingSign * GetPrimitiveData(Parameters.PrimitiveId).InvNonUniformScaleAndDeterminantSign.w;
    #endif

    #if !MATERIAL_TWOSIDED_SEPARATE_PASS
        Parameters.TwoSidedSign *= GetFloatFacingSign(bIsFrontFace);
    #endif
#endif

#if NUM_VIRTUALTEXTURE_SAMPLES || LIGHTMAP_VT_ENABLED
    InitializeVirtualTextureFeedback(Parameters.VirtualTextureFeedback, (uint2)SvPosition.xy, View.FrameNumber);
#endif

    // Now that we have all the pixel-related parameters setup, calculate the Material Input/Attributes and Normal
    CalcPixelMaterialInputs(Parameters, PixelMaterialInputs);
}

// convenience function to setup CalcMaterialParameters assuming we don't support TranslatedWorldPositionExcludingShaderOffsets
// @param SvPosition from SV_Position when rendering the view, for other projections e.g. shadowmaps this function cannot be used and you need to call CalcMaterialParametersEx()
void CalcMaterialParameters(
    in out FMaterialPixelParameters Parameters,
    in out FPixelMaterialInputs PixelMaterialInputs,
    float4 SvPosition,
    FIsFrontFace bIsFrontFace)
{
    float4 ScreenPosition = SvPositionToResolvedScreenPosition(SvPosition);
    float3 TranslatedWorldPosition = SvPositionToResolvedTranslatedWorld(SvPosition);

    CalcMaterialParametersEx(Parameters, PixelMaterialInputs, SvPosition, ScreenPosition, bIsFrontFace, TranslatedWorldPosition, TranslatedWorldPosition);
}

void CalcMaterialParametersPost(
    in out FMaterialPixelParameters Parameters,
    in out FPixelMaterialInputs PixelMaterialInputs,
    float4 SvPosition,
    FIsFrontFace bIsFrontFace)
{
    float4 ScreenPosition = SvPositionToScreenPosition(SvPosition);
    float3 TranslatedWorldPosition = SvPositionToTranslatedWorld(SvPosition);

    CalcMaterialParametersEx(Parameters, PixelMaterialInputs, SvPosition, ScreenPosition, bIsFrontFace, TranslatedWorldPosition, TranslatedWorldPosition);
}

/** Assemble the transform from tangent space into world space */
half3x3 AssembleTangentToWorld( half3 TangentToWorld0, half4 TangentToWorld2 )
{
    // Will not be orthonormal after interpolation. This perfectly matches xNormal.
    // Any mismatch with xNormal will cause distortions for baked normal maps.

    // Derive the third basis vector off of the other two.
    // Flip based on the determinant sign
    half3 TangentToWorld1 = cross(TangentToWorld2.xyz,TangentToWorld0) * TangentToWorld2.w;
    // Transform from tangent space to world space
    return half3x3(TangentToWorld0, TangentToWorld1, TangentToWorld2.xyz);
}

// Whether the material shader should output pixel depth offset
#define OUTPUT_PIXEL_DEPTH_OFFSET (WANT_PIXEL_DEPTH_OFFSET && (MATERIALBLENDING_SOLID || MATERIALBLENDING_MASKED))

// Whether to use the hidden d3d11 feature that supports depth writes with ZCull by only pushing into the screen
//@todo - use for other SM5 platforms
#define SUPPORTS_CONSERVATIVE_DEPTH_WRITES ((COMPILER_HLSL && FEATURE_LEVEL >= FEATURE_LEVEL_SM5) || (PS4_PROFILE) || (COMPILER_METAL && FEATURE_LEVEL >= FEATURE_LEVEL_SM5) || SWITCH_PROFILE || SWITCH_PROFILE_FORWARD)
#define USE_CONSERVATIVE_DEPTH_WRITES (OUTPUT_PIXEL_DEPTH_OFFSET && SUPPORTS_CONSERVATIVE_DEPTH_WRITES)

#if USE_CONSERVATIVE_DEPTH_WRITES

#if COMPILER_HLSL
    // Note: for some reason using SV_DepthLessEqual without these interpolation modifiers causes a compile error in d3d
    #define INPUT_POSITION_QUALIFIERS linear noperspective centroid
    // Use conservative depth output so we still get Z Cull.  Note, this is a reversed Z depth surface.
    #define DEPTH_WRITE_SEMANTIC SV_DepthLessEqual
#elif COMPILER_METAL
    #define INPUT_POSITION_QUALIFIERS
    #define DEPTH_WRITE_SEMANTIC SV_DepthLessEqual
#elif PS4_PROFILE
    #define INPUT_POSITION_QUALIFIERS
    #define DEPTH_WRITE_SEMANTIC S_DEPTH_LE_OUTPUT
#elif SWITCH_PROFILE || SWITCH_PROFILE_FORWARD
    #define INPUT_POSITION_QUALIFIERS
    #define DEPTH_WRITE_SEMANTIC SV_DepthLessEqual
#else
    #error USE_CONSERVATIVE_DEPTH_WRITES enabled for unsupported platform
#endif

#else
    #define INPUT_POSITION_QUALIFIERS
    #define DEPTH_WRITE_SEMANTIC SV_DEPTH
#endif

#if OUTPUT_PIXEL_DEPTH_OFFSET
    #define OPTIONAL_OutDepthConservative ,out float OutDepth : DEPTH_WRITE_SEMANTIC
    #define OPTIONAL_OutDepth ,out float OutDepth : SV_DEPTH
#else
    #define OPTIONAL_OutDepthConservative
    #define OPTIONAL_OutDepth
#endif

float ApplyPixelDepthOffsetToMaterialParameters(inout FMaterialPixelParameters MaterialParameters, FPixelMaterialInputs PixelMaterialInputs, out float OutDepth)
{
    float PixelDepthOffset = GetMaterialPixelDepthOffset(PixelMaterialInputs);

    // SvPosition.z contains device depth value normally written to depth buffer
    // ScreenPosition.z is 'SvPosition.z * SvPosition.w'
    // So here we compute a new device depth value with the given pixel depth offset, but clamp the value against the regular SvPosition.z
    // This clamp is important, even if PixelDepthOffset is 0.0f, the computed DeviceDepth may end up 'slightly' larger than SvPosition.z due to floating point whatever
    // Since we are outputing depth with SV_DepthLessEqual, this ends up as undefined behavior
    // In particular, this can cause problems on PS4....PS4 enables RE_Z when using depth output along with virtual texture UAV feedback buffer writes
    // RE_Z causes the HW to perform depth test twice, once before executing pixel shader, and once after
    // The PreZ pass will write depth buffer using depth offset, then the base pass will test against this value using both modified and unmodifed depth
    // If the unmodified depth is ever slightly less than the modified depth, the initial depth test will fail, which results in z-fighting/flickering type artifacts
    float DeviceDepth = min(MaterialParameters.ScreenPosition.z / (MaterialParameters.ScreenPosition.w + PixelDepthOffset), MaterialParameters.SvPosition.z);

    // Once we've computed our (clamped) device depth, recompute PixelDepthOffset again to take the potential clamp into account
    PixelDepthOffset = (MaterialParameters.ScreenPosition.z - DeviceDepth * MaterialParameters.ScreenPosition.w) / DeviceDepth;

    // Update positions used for shading
    MaterialParameters.ScreenPosition.w += PixelDepthOffset;
    MaterialParameters.SvPosition.w = MaterialParameters.ScreenPosition.w;
    MaterialParameters.AbsoluteWorldPosition += MaterialParameters.CameraVector * PixelDepthOffset;

    OutDepth = INVARIANT(DeviceDepth);

    return PixelDepthOffset;
}
