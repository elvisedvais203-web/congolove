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

  async pay(payload: PaymentRequest): Promise<PaymentResult> {
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
