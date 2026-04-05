import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    uploadUrl: "https://cdn.example.com/upload-url",
    note: "Endpoint placeholder pour upload direct S3/Cloudinary signe"
  });
}
