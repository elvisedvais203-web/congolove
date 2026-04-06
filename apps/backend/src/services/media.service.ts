import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function uploadMedia(filePath: string, folder: string): Promise<string> {
  if (env.mediaProvider !== "cloudinary") {
    if (env.nodeEnv === "production") {
      throw new Error("MEDIA_PROVIDER invalide en production. Configurez Cloudinary.");
    }
    return `http://localhost/mock-media/${folder}/${Date.now()}`;
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary non configure. Renseignez CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.");
  }

  const uploaded = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "auto"
  });
  return uploaded.secure_url;
}
