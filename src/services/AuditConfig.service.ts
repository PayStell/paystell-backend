interface SensitiveFieldConfig {
  fieldName: string;
  maskFunction?: (value: any) => any;
}

class AuditConfigService {
  private readonly sensitiveEntities = new Map<
    string,
    SensitiveFieldConfig[]
  >();

  constructor() {
    this.configuresSensitiveFields();
  }

  private configuresSensitiveFields() {
    // Example: So every entity should set their sensitive fields
    this.sensitiveEntities.set("users", [
      { fieldName: "password", maskFunction: () => "******" },
      {
        fieldName: "walletAddress",
        maskFunction: () => "***********************",
      },
    ]);

    this.sensitiveEntities.set("merchants", [
      { fieldName: "secret", maskFunction: () => "********" },
    ]);

    this.sensitiveEntities.set("WalletVerification", [
      { fieldName: "walletAddress", maskFunction: () => "********" },
    ]);
  }

  getSensitiveFieldsForEntity(entityName: string): SensitiveFieldConfig[] {
    return this.sensitiveEntities.get(entityName) || [];
  }

  maskSensitiveData(
    entityName: string,
    data: Record<string, any>,
  ): Record<string, any> {
    if (!data) return data;

    const sensitiveFieldConfigs = this.getSensitiveFieldsForEntity(entityName);
    if (!sensitiveFieldConfigs.length) return data;

    const maskedData = { ...data };

    for (const config of sensitiveFieldConfigs) {
      if (maskedData[config.fieldName] !== undefined) {
        maskedData[config.fieldName] = config.maskFunction
          ? config.maskFunction(maskedData[config.fieldName])
          : "******";
      }
    }
    return maskedData;
  }
}

export const auditConfigService = new AuditConfigService();
