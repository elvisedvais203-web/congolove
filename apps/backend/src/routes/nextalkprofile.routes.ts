import { Router } from "express";
import { addProfilePhoto, deleteMyAccount, myProfile, updateProfile, updateProfileSettings, verifyIdentity } from "../controllers/nextalkprofile.controller";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";

const router = Router();

router.get("/me", authGuard, myProfile);
router.patch("/me", authGuard, csrfGuard, updateProfile);
router.patch("/settings", authGuard, csrfGuard, updateProfileSettings);
router.post("/photo", authGuard, csrfGuard, addProfilePhoto);
router.delete("/me", authGuard, csrfGuard, deleteMyAccount);
router.post("/verify-identity", authGuard, csrfGuard, verifyIdentity);

export default router;
