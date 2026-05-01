import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/nextalkenv";
import { normalizeRdcPhone } from "../src/utils/nextalkphone";

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_USER_PASSWORD ?? env.superAdminPassword;
  if (!seedPassword) {
    throw new Error("SEED_USER_PASSWORD ou SUPERADMIN_PASSWORD requis pour seed en environnement non-demo.");
  }
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const userA = await prisma.user.upsert({
    where: { phone: "+243970000001" },
    update: {},
    create: {
      phone: "+243970000001",
      email: "alice@nextalk.app",
      passwordHash,
      otpVerified: true,
      planTier: "PREMIUM",
      profile: {
        create: {
          displayName: "Alice",
          bio: "Entrepreneure a Kinshasa",
          city: "Kinshasa",
          interests: ["startup", "musique", "voyage"],
          verifiedBadge: true
        }
      }
    }
  });

  await prisma.photo.create({
    data: {
      userId: userA.id,
      url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
      isPrimary: true
    }
  });

  const userB = await prisma.user.upsert({
    where: { phone: "+243990000002" },
    update: {},
    create: {
      phone: "+243990000002",
      email: "amani@nextalk.app",
      passwordHash,
      otpVerified: true,
      planTier: "FREE",
      profile: {
        create: {
          displayName: "Amani",
          bio: "Passionnee de lecture et cinema",
          city: "Goma",
          interests: ["lecture", "cinema", "sport"]
        }
      }
    }
  });

  const userC = await prisma.user.upsert({
    where: { phone: "+243980000003" },
    update: {},
    create: {
      phone: "+243980000003",
      email: "merveille@nextalk.app",
      passwordHash,
      otpVerified: true,
      planTier: "PREMIUM",
      profile: {
        create: {
          displayName: "Merveille",
          bio: "Creatrice lifestyle et events",
          city: "Lubumbashi",
          interests: ["mode", "photos", "events"]
        }
      }
    }
  });

  await prisma.photo.createMany({
    data: [
      {
        userId: userB.id,
        url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
        isPrimary: true
      },
      {
        userId: userC.id,
        url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
        isPrimary: true
      }
    ],
    skipDuplicates: true
  });

  const privateChat = await prisma.chat.upsert({
    where: { id: `private-${userA.id}-${userB.id}` },
    update: {},
    create: {
      id: `private-${userA.id}-${userB.id}`,
      kind: "PRIVATE",
      members: {
        create: [
          { userId: userA.id, role: "ADMIN" },
          { userId: userB.id, role: "ADMIN" }
        ]
      }
    }
  });

  const groupChat = await prisma.chat.upsert({
    where: { id: "group-kin-vibes" },
    update: {},
    create: {
      id: "group-kin-vibes",
      kind: "GROUP",
      title: "Kin Vibes Night",
      avatarUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865",
      members: {
        create: [
          { userId: userA.id, role: "ADMIN" },
          { userId: userB.id, role: "MEMBER" },
          { userId: userC.id, role: "MEMBER" }
        ]
      }
    }
  });

  const messageOne = await prisma.chatMessage.upsert({
    where: { id: "seed-private-1" },
    update: {},
    create: {
      id: "seed-private-1",
      chatId: privateChat.id,
      senderId: userB.id,
      type: "TEXT",
      text: "Salut Alice, tu vas bien ?",
      receipts: {
        create: [{ userId: userA.id }]
      }
    }
  });

  await prisma.chatMessageReceipt.upsert({
    where: { messageId_userId: { messageId: messageOne.id, userId: userA.id } },
    update: {},
    create: { messageId: messageOne.id, userId: userA.id }
  });

  await prisma.chatMessage.upsert({
    where: { id: "seed-group-1" },
    update: {},
    create: {
      id: "seed-group-1",
      chatId: groupChat.id,
      senderId: userC.id,
      type: "TEXT",
      text: "Les amis, qui vient a la soiree rooftop samedi ?",
      receipts: {
        create: [{ userId: userA.id }, { userId: userB.id }]
      }
    }
  });

  if (env.superAdminEmail && env.superAdminPhone && env.superAdminPassword) {
    const superAdminPhone = normalizeRdcPhone(env.superAdminPhone);
    const superAdminHash = await bcrypt.hash(env.superAdminPassword, 12);
    const superAdminName = process.env.SUPERADMIN_NAME ?? "Super Admin";
    const superAdminCreatedAt = process.env.SUPERADMIN_CREATED_AT ? new Date(process.env.SUPERADMIN_CREATED_AT) : undefined;

    await prisma.user.upsert({
      where: { phone: superAdminPhone },
      update: {
        email: env.superAdminEmail,
        passwordHash: superAdminHash,
        otpVerified: true,
        role: "SUPERADMIN",
        planTier: "PREMIUM"
      },
      create: {
        phone: superAdminPhone,
        email: env.superAdminEmail,
        passwordHash: superAdminHash,
        otpVerified: true,
        role: "SUPERADMIN",
        planTier: "PREMIUM",
        ...(superAdminCreatedAt ? { createdAt: superAdminCreatedAt } : {}),
        profile: {
          create: {
            displayName: superAdminName,
            bio: "Compte fondateur",
            city: "Kinshasa",
            interests: ["admin", "security", "growth"],
            verifiedBadge: true
          }
        }
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
