export type PlanTier = "FREE" | "PREMIUM";

export type PaymentProviderName =
  | "airtel_money"
  | "orange_money"
  | "m_pesa"
  | "africell_money"
  | "afrimoney";

export interface PremiumFeatureFlags {
  unlimitedMessages: boolean;
  seeWhoLikedYou: boolean;
  profileBoost: boolean;
  invisibleMode: boolean;
  unlimitedHdMedia: boolean;
}

export const freeTierFeatures: PremiumFeatureFlags = {
  unlimitedMessages: false,
  seeWhoLikedYou: false,
  profileBoost: false,
  invisibleMode: false,
  unlimitedHdMedia: false
};

export const premiumTierFeatures: PremiumFeatureFlags = {
  unlimitedMessages: true,
  seeWhoLikedYou: true,
  profileBoost: true,
  invisibleMode: true,
  unlimitedHdMedia: true
};
