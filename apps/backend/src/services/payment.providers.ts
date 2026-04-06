import { env } from "../config/env";

export interface PaymentRequest {
  amountCdf: number;
  phone: string;
  externalRef: string;
}

export interface PaymentResult {
  success: boolean;
  providerTxId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
}

export interface PaymentProvider {
  providerName: string;
  pay(payload: PaymentRequest): Promise<PaymentResult>;
}

abstract class BasePaymentProvider implements PaymentProvider {
  abstract providerName: string;

  protected getApiConfig(): { url: string; token: string } {
    switch (this.providerName) {
      case "airtel_money":
        return { url: env.mmAirtelApiUrl, token: env.mmAirtelApiToken };
      case "orange_money":
        return { url: env.mmOrangeApiUrl, token: env.mmOrangeApiToken };
      case "m_pesa":
        return { url: env.mmMPesaApiUrl, token: env.mmMPesaApiToken };
      case "africell_money":
        return { url: env.mmAfricellApiUrl, token: env.mmAfricellApiToken };
      case "afrimoney":
        return { url: env.mmAfrimoneyApiUrl, token: env.mmAfrimoneyApiToken };
      default:
        return { url: "", token: "" };
    }
  }

  async pay(payload: PaymentRequest): Promise<PaymentResult> {
    const { url, token } = this.getApiConfig();
    if (url && token) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amountCdf: payload.amountCdf,
          phone: payload.phone,
          externalRef: payload.externalRef
        })
      });

      if (!response.ok) {
        return {
          success: false,
          providerTxId: `${this.providerName}_HTTP_${response.status}_${Date.now()}`,
          status: "FAILED"
        };
      }

      const data = (await response.json()) as { providerTxId?: string; status?: "PENDING" | "SUCCESS" | "FAILED"; success?: boolean };
      const inferredSuccess = data.status === "SUCCESS" || data.status === "PENDING";
      return {
        success: data.success ?? inferredSuccess,
        providerTxId: data.providerTxId ?? `${this.providerName}_${Date.now()}`,
        status: data.status ?? "PENDING"
      };
    }

    // Sandbox fallback when no real provider API is configured.
    const isSuccess = payload.phone.length >= 9;
    return {
      success: isSuccess,
      providerTxId: `${this.providerName}_${Date.now()}`,
      status: isSuccess ? "SUCCESS" : "FAILED"
    };
  }
}

export class AirtelMoneyProvider extends BasePaymentProvider {
  providerName = "airtel_money";
}

export class OrangeMoneyProvider extends BasePaymentProvider {
  providerName = "orange_money";
}

export class MPesaProvider extends BasePaymentProvider {
  providerName = "m_pesa";
}

export class AfricellMoneyProvider extends BasePaymentProvider {
  providerName = "africell_money";
}

export class AfriMoneyProvider extends BasePaymentProvider {
  providerName = "afrimoney";
}

export function paymentProviderFactory(provider: string): PaymentProvider {
  switch (provider) {
    case "airtel_money":
      return new AirtelMoneyProvider();
    case "orange_money":
      return new OrangeMoneyProvider();
    case "m_pesa":
      return new MPesaProvider();
    case "africell_money":
      return new AfricellMoneyProvider();
    case "afrimoney":
      return new AfriMoneyProvider();
    default:
      throw new Error("Provider non supporte");
  }
}
