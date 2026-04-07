import { Router } from "express";
import { addProfilePhoto, deleteMyAccount, myProfile, updateProfile, updateProfileSettings, verifyIdentity } from "../controllers/profile.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";

const router = Router();

router.get("/me", authGuard, myProfile);
router.patch("/me", authGuard, csrfGuard, updateProfile);
router.patch("/settings", authGuard, csrfGuard, updateProfileSettings);
router.post("/photo", authGuard, csrfGuard, addProfilePhoto);
router.delete("/me", authGuard, csrfGuard, deleteMyAccount);
router.post("/verify-identity", authGuard, csrfGuard, verifyIdentity);

export default router;
