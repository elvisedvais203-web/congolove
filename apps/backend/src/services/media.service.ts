import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function uploadMedia(filePath: string, folder: string): Promise<string> {
  if (env.mediaProvider !== "cloudinary") {
    return `https://cdn.example.com/${folder}/${Date.now()}`;
  }

  const uploaded = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "auto"
  });
  return uploaded.secure_url;
}
