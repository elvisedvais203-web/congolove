import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/nextalkenv";
import { ApiError } from "../utils/nextalkapierror";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function assertCloudinaryConfigured(): { cloudName: string; apiKey: string; apiSecret: string } {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(503, "Stockage media non configure. Contactez l'administrateur.");
  }
  return { cloudName, apiKey, apiSecret };
}

export async function uploadMedia(filePath: string, folder: string): Promise<string> {
  if (env.mediaProvider !== "cloudinary") {
    if (env.nodeEnv === "production") {
      throw new ApiError(503, "Stockage media non configure. Contactez l'administrateur.");
    }
    return `http://localhost/mock-media/${folder}/${Date.now()}`;
  }

  assertCloudinaryConfigured();

  const uploaded = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "auto"
  });
  return uploaded.secure_url;
}

export function createSignedUploadPayload(params: {
  folder: string;
  publicId?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
}) {
  if (env.mediaProvider !== "cloudinary") {
    throw new ApiError(400, "Les signatures d'upload direct sont disponibles uniquement avec MEDIA_PROVIDER=cloudinary.");
  }

  const { cloudName, apiKey, apiSecret } = assertCloudinaryConfigured();
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign: Record<string, string | number> = {
    folder: params.folder,
    timestamp,
    resource_type: params.resourceType ?? "auto"
  };

  if (params.publicId) {
    toSign.public_id = params.publicId;
  }

  const signature = cloudinary.utils.api_sign_request(toSign, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: params.folder,
    resourceType: params.resourceType ?? "auto",
    publicId: params.publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${params.resourceType ?? "auto"}/upload`
  };
}
