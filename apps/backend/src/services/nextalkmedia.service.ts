import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/nextalkenv";
import { ApiError } from "../utils/nextalkapierror";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function uploadMedia(filePath: string, folder: string): Promise<string> {
  if (env.mediaProvider !== "cloudinary") {
    if (env.nodeEnv === "production") {
      throw new ApiError(503, "Stockage media non configure. Contactez l'administrateur.");
    }
    return `http://localhost/mock-media/${folder}/${Date.now()}`;
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new ApiError(503, "Stockage media non configure. Contactez l'administrateur.");
  }

  const uploaded = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "auto"
  });
  return uploaded.secure_url;
}
