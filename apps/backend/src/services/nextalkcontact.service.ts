import { prisma } from "../config/nextalkdb";
import { logger } from "../utils/nextalklogger";
import crypto from "crypto";
import { parsePhoneNumber } from "libphonenumber-js";

/**
 * Hash a phone number for privacy (don't store raw phone numbers)
 */
function hashPhoneNumber(phoneNumber: string): string {
  return crypto.createHash("sha256").update(phoneNumber).digest("hex");
}

/**
 * Import contacts from a list of phone numbers
 * Returns contacts that exist on NexTalk
 */
export async function importContactsFromPhones(
  userId: string,
  phoneNumbers: string[]
): Promise<{ success: boolean; contacts?: any[]; error?: string }> {
  try {
    const foundContacts = [];

    for (const phone of phoneNumbers) {
      try {
        // Normalize phone number (basic validation)
        const cleaned = phone.replace(/\D/g, "");
        if (cleaned.length < 9) {
          continue; // Skip invalid numbers
        }

        // Search for user with this phone
        const existingUser = await prisma.user.findUnique({
          where: { phone: cleaned },
          include: { profile: true }
        });

        if (existingUser && existingUser.id !== userId) {
          // Check if already a contact
          const existing = await prisma.contact.findFirst({
            where: {
              userId,
              contactUserId: existingUser.id
            }
          });

          if (!existing) {
            // Add as contact
            const contact = await prisma.contact.create({
              data: {
                userId,
                contactUserId: existingUser.id,
                contactPhoneNumber: cleaned,
                contactPhoneNumberHash: hashPhoneNumber(cleaned),
                displayName: existingUser.profile?.displayName || "Unknown"
              }
            });

            foundContacts.push({
              contactId: contact.id,
              userId: existingUser.id,
              username: existingUser.username,
              displayName: contact.displayName
            });
          }
        }
      } catch (err) {
        logger.warn("Error processing phone number", { phone, error: err });
      }
    }

    logger.info(`Imported ${foundContacts.length} contacts for user ${userId}`);
    return { success: true, contacts: foundContacts };
  } catch (error) {
    logger.error("Error importing contacts", { userId, error });
    return { success: false, error: "Failed to import contacts" };
  }
}

/**
 * Add a contact manually
 */
export async function addContact(userId: string, contactUserId: string, displayName?: string) {
  if (userId === contactUserId) {
    return { success: false, error: "Cannot add yourself as a contact" };
  }

  try {
    // Check if already a contact
    const existing = await prisma.contact.findFirst({
      where: {
        userId,
        contactUserId
      }
    });

    if (existing) {
      return { success: false, error: "Already a contact" };
    }

    const contact = await prisma.contact.create({
      data: {
        userId,
        contactUserId,
        displayName
      }
    });

    logger.info(`Contact added: ${userId} → ${contactUserId}`);
    return { success: true, contact };
  } catch (error) {
    logger.error("Error adding contact", { userId, contactUserId, error });
    return { success: false, error: "Failed to add contact" };
  }
}

/**
 * Remove a contact
 */
export async function removeContact(userId: string, contactUserId: string) {
  try {
    await prisma.contact.deleteMany({
      where: {
        userId,
        contactUserId
      }
    });

    logger.info(`Contact removed: ${userId} → ${contactUserId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error removing contact", { userId, contactUserId, error });
    return { success: false, error: "Failed to remove contact" };
  }
}

/**
 * Get user's contacts
 */
export async function getContacts(userId: string, includeBlocked: boolean = false) {
  try {
    const where: any = {
      userId,
      blockedAt: includeBlocked ? undefined : null
    };

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        contactUser: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return contacts;
  } catch (error) {
    logger.error("Error getting contacts", { userId, error });
    return [];
  }
}

/**
 * Get contact count
 */
export async function getContactCount(userId: string): Promise<number> {
  try {
    return await prisma.contact.count({
      where: {
        userId,
        blockedAt: null
      }
    });
  } catch (error) {
    logger.error("Error getting contact count", { userId, error });
    return 0;
  }
}

/**
 * Check if user is a contact
 */
export async function isContact(userId: string, contactUserId: string): Promise<boolean> {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        userId,
        contactUserId,
        blockedAt: null
      }
    });

    return !!contact;
  } catch (error) {
    logger.error("Error checking contact", { userId, contactUserId, error });
    return false;
  }
}

/**
 * Set contact as favorite
 */
export async function setFavoriteContact(userId: string, contactUserId: string, isFavorite: boolean) {
  try {
    const contact = await prisma.contact.updateMany({
      where: {
        userId,
        contactUserId
      },
      data: {
        isFavorite
      }
    });

    return { success: true, contact };
  } catch (error) {
    logger.error("Error setting favorite contact", { userId, contactUserId, error });
    return { success: false, error: "Failed to update contact" };
  }
}

/**
 * Get favorite contacts
 */
export async function getFavoriteContacts(userId: string) {
  try {
    return await prisma.contact.findMany({
      where: {
        userId,
        isFavorite: true,
        blockedAt: null
      },
      include: {
        contactUser: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true
              }
            }
          }
        }
      }
    });
  } catch (error) {
    logger.error("Error getting favorite contacts", { userId, error });
    return [];
  }
}

/**
 * Search contacts by name or username
 */
export async function searchContacts(userId: string, query: string) {
  try {
    const lower = query.toLowerCase();

    return await prisma.contact.findMany({
      where: {
        userId,
        blockedAt: null,
        OR: [
          {
            displayName: {
              contains: lower,
              mode: "insensitive"
            }
          },
          {
            contactUser: {
              username: {
                contains: lower,
                mode: "insensitive"
              }
            }
          }
        ]
      },
      include: {
        contactUser: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true
              }
            }
          }
        }
      }
    });
  } catch (error) {
    logger.error("Error searching contacts", { userId, query, error });
    return [];
  }
}
