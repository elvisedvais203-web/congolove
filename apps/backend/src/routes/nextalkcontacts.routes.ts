import { Router, Request, Response } from "express";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import {
  importContactsFromPhones,
  addContact,
  removeContact,
  getContacts,
  getContactCount,
  isContact,
  setFavoriteContact,
  getFavoriteContacts,
  searchContacts
} from "../services/nextalkcontact.service";
import { blockUser, unblockUser, getBlockedUsers } from "../services/nextalkblock.service";
import { ApiError } from "../utils/nextalkapierror";

const router = Router();

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * Import contacts from phone numbers
 * POST /api/contacts/import
 */
router.post("/import", authGuard, csrfGuard, async (req: AuthRequest, res, next) => {
  try {
    const { phoneNumbers } = req.body;
    const userId = req.userId!;

    if (!Array.isArray(phoneNumbers)) {
      throw new ApiError(400, "phoneNumbers must be an array");
    }

    if (phoneNumbers.length === 0) {
      throw new ApiError(400, "At least one phone number is required");
    }

    if (phoneNumbers.length > 1000) {
      throw new ApiError(400, "Maximum 1000 contacts can be imported at once");
    }

    const result = await importContactsFromPhones(userId, phoneNumbers);

    if (!result.success) {
      throw new ApiError(500, result.error || "Failed to import contacts");
    }

    res.json({
      message: "Contacts imported successfully",
      count: result.contacts?.length || 0,
      contacts: result.contacts || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add a contact manually
 * POST /api/contacts/add
 */
router.post("/add", authGuard, csrfGuard, async (req: AuthRequest, res, next) => {
  try {
    const { contactUserId, displayName } = req.body;
    const userId = req.userId!;

    if (!contactUserId) {
      throw new ApiError(400, "contactUserId is required");
    }

    const result = await addContact(userId, contactUserId, displayName);

    if (!result.success) {
      throw new ApiError(400, result.error || "Failed to add contact");
    }

    res.json({
      message: "Contact added successfully",
      contact: result.contact
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Remove a contact
 * DELETE /api/contacts/:contactUserId
 */
router.delete("/:contactUserId", authGuard, csrfGuard, async (req: AuthRequest, res, next) => {
  try {
    const { contactUserId } = req.params;
    const userId = req.userId!;

    const result = await removeContact(userId, String(contactUserId));

    if (!result.success) {
      throw new ApiError(400, result.error || "Failed to remove contact");
    }

    res.json({
      message: "Contact removed successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all contacts
 * GET /api/contacts/list
 */
router.get("/list", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { includeBlocked = "false" } = req.query;

    const contacts = await getContacts(userId, includeBlocked === "true");
    const count = await getContactCount(userId);

    res.json({
      count,
      contacts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Set contact as favorite
 * POST /api/contacts/:contactUserId/favorite
 */
router.post("/:contactUserId/favorite", authGuard, csrfGuard, async (req: AuthRequest, res, next) => {
  try {
    const { contactUserId } = req.params;
    const { isFavorite } = req.body;
    const userId = req.userId!;

    const result = await setFavoriteContact(userId, String(contactUserId), isFavorite === true);

    if (!result.success) {
      throw new ApiError(400, result.error || "Failed to update favorite");
    }

    res.json({
      message: "Contact favorite status updated",
      isFavorite
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get favorite contacts
 * GET /api/contacts/favorites
 */
router.get("/favorites", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const favorites = await getFavoriteContacts(userId);

    res.json({
      count: favorites.length,
      contacts: favorites
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Search contacts
 * GET /api/contacts/search?q=query
 */
router.get("/search", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const { q } = req.query;
    const userId = req.userId!;

    if (!q || typeof q !== "string") {
      throw new ApiError(400, "Search query is required");
    }

    const results = await searchContacts(userId, q);

    res.json({
      query: q,
      count: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Block a contact
 * POST /api/contacts/:contactUserId/block
 */
router.post("/:contactUserId/block", authGuard, csrfGuard, async (req: AuthRequest, res, next) => {
  try {
    const { contactUserId } = req.params;
    const { reason } = req.body;
    const userId = req.userId!;

    const result = await blockUser(userId, contactUserId as string, reason);

    if (!result.success) {
      throw new ApiError(400, result.error || "Failed to block contact");
    }

    res.json({
      message: "Contact blocked successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Unblock a contact
 * DELETE /api/contacts/:contactUserId/block
 */
router.delete("/:contactUserId/block", authGuard, csrfGuard, async (req: AuthRequest, res, next) => {
  try {
    const { contactUserId } = req.params;
    const userId = req.userId!;

    const result = await unblockUser(userId, contactUserId as string);

    if (!result.success) {
      throw new ApiError(400, result.error || "Failed to unblock contact");
    }

    res.json({
      message: "Contact unblocked successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get blocked users
 * GET /api/contacts/blocked-users
 */
router.get("/blocked-users", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const blockedUsers = await getBlockedUsers(userId);

    res.json({
      count: blockedUsers.length,
      blockedUsers
    });
  } catch (error) {
    next(error);
  }
});

export default router;
