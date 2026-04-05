import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/db";

export async function myProfile(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          phone: true,
          email: true,
          planTier: true,
          reputation: true,
          dataSaverEnabled: true,
          invisibleMode: true,
          photos: true
        }
      }
    }
  });
  res.json(profile);
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { displayName, bio, city, interests, dataSaverEnabled, invisibleMode } = req.body as {
    displayName: string;
    bio?: string;
    city?: string;
    interests: string[];
    dataSaverEnabled?: boolean;
    invisibleMode?: boolean;
  };

  const profile = await prisma.profile.update({
    where: { userId },
    data: { displayName, bio, city, interests }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { dataSaverEnabled, invisibleMode }
  });

  res.json(profile);
}
