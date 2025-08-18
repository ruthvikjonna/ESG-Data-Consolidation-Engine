export interface ESGDataSchema {
  environmental: {
    carbonEmissions?: number;
    energyConsumption?: number;
    waterUsage?: number;
    wasteGeneration?: number;
    renewableEnergyPercentage?: number;
  };
  social: {
    employeeCount?: number;
    diversityMetrics?: {
      genderRatio?: number;
      ethnicDiversity?: number;
      ageDistribution?: { [key: string]: number };
    };
    healthAndSafety?: {
      incidents?: number;
      trainingHours?: number;
    };
    communityInvestment?: number;
  };
  governance: {
    boardComposition?: {
      independentDirectors?: number;
      totalDirectors?: number;
      diversityPercentage?: number;
    };
    executiveCompensation?: {
      ceoPayRatio?: number;
      medianEmployeePay?: number;
    };
    complianceMetrics?: {
      regulatoryViolations?: number;
      auditFindings?: number;
    };
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 ESG compliance score
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

export class ESGValidationEngine {
  private static instance: ESGValidationEngine;
  
  private constructor() {}
  
  public static getInstance(): ESGValidationEngine {
    if (!ESGValidationEngine.instance) {
      ESGValidationEngine.instance = new ESGValidationEngine();
    }
    return ESGValidationEngine.instance;
  }

  /**
   * Validate ESG data against defined schemas and standards
   */
  async validateData(data: any, source: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    try {
      // Normalize data based on source
      const normalizedData = this.normalizeData(data, source);
      
      // Validate environmental metrics
      this.validateEnvironmentalMetrics(normalizedData.environmental, errors, warnings);
      
      // Validate social metrics
      this.validateSocialMetrics(normalizedData.social, errors, warnings);
      
      // Validate governance metrics
      this.validateGovernanceMetrics(normalizedData.governance, errors, warnings);
      
      // Calculate ESG compliance score
      const score = this.calculateESGScore(normalizedData, errors);
      
      return {
        isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
        errors,
        warnings,
        score,
      };
      
    } catch (error) {
      errors.push({
        field: 'general',
        message: `Validation error: ${error.message}`,
        severity: 'critical',
      });
      
      return {
        isValid: false,
        errors,
        warnings,
        score: 0,
      };
    }
  }

  /**
   * Normalize data from different sources into standard ESG format
   */
  private normalizeData(data: any, source: string): ESGDataSchema {
    switch (source) {
      case 'quickbooks':
        return this.normalizeQuickBooksData(data);
      case 'google-sheets':
        return this.normalizeGoogleSheetsData(data);
      case 'microsoft-graph':
        return this.normalizeMicrosoftGraphData(data);
      default:
        return this.normalizeGenericData(data);
    }
  }

  /**
   * Normalize QuickBooks financial data into ESG metrics
   */
  private normalizeQuickBooksData(data: any): ESGDataSchema {
    // Extract financial data and map to ESG metrics
    // This is a simplified example - you'd implement comprehensive mapping
    return {
      environmental: {
        carbonEmissions: this.extractNumericValue(data, 'carbon_emissions'),
        energyConsumption: this.extractNumericValue(data, 'energy_consumption'),
      },
      social: {
        employeeCount: this.extractNumericValue(data, 'employee_count'),
        communityInvestment: this.extractNumericValue(data, 'community_investment'),
      },
      governance: {
        executiveCompensation: {
          ceoPayRatio: this.extractNumericValue(data, 'ceo_pay_ratio'),
          medianEmployeePay: this.extractNumericValue(data, 'median_employee_pay'),
        },
      },
    };
  }

  /**
   * Normalize Google Sheets data into ESG metrics
   */
  private normalizeGoogleSheetsData(data: any): ESGDataSchema {
    // Parse spreadsheet data and map to ESG metrics
    const sheets = data.sheets || [];
    const normalized: ESGDataSchema = {
      environmental: {},
      social: {},
      governance: {},
    };

    // Process each sheet for ESG data
    sheets.forEach((sheet: any) => {
      const sheetTitle = sheet.properties?.title?.toLowerCase() || '';
      
      if (sheetTitle.includes('environmental') || sheetTitle.includes('carbon')) {
        this.processEnvironmentalSheet(sheet, normalized.environmental);
      } else if (sheetTitle.includes('social') || sheetTitle.includes('employee')) {
        this.processSocialSheet(sheet, normalized.social);
      } else if (sheetTitle.includes('governance') || sheetTitle.includes('board')) {
        this.processGovernanceSheet(sheet, normalized.governance);
      }
    });

    return normalized;
  }

  /**
   * Normalize Microsoft Graph/Excel data into ESG metrics
   */
  private normalizeMicrosoftGraphData(data: any): ESGDataSchema {
    // Parse Excel data and map to ESG metrics
    // This would depend on the Excel file structure
    return {
      environmental: {},
      social: {},
      governance: {},
    };
  }

  /**
   * Normalize generic data into ESG metrics
   */
  private normalizeGenericData(data: any): ESGDataSchema {
    // Try to intelligently map any data structure to ESG format
    return {
      environmental: this.extractEnvironmentalData(data),
      social: this.extractSocialData(data),
      governance: this.extractGovernanceData(data),
    };
  }

  /**
   * Process environmental data from spreadsheet
   */
  private processEnvironmentalSheet(sheet: any, environmental: any): void {
    const rows = sheet.data?.[0]?.rowData || [];
    
    rows.forEach((row: any) => {
      const values = row.values || [];
      if (values.length >= 2) {
        const metric = values[0]?.formattedValue?.toLowerCase() || '';
        const value = this.parseNumericValue(values[1]?.formattedValue);
        
        if (metric.includes('carbon') && value !== null) {
          environmental.carbonEmissions = value;
        } else if (metric.includes('energy') && value !== null) {
          environmental.energyConsumption = value;
        } else if (metric.includes('water') && value !== null) {
          environmental.waterUsage = value;
        }
      }
    });
  }

  /**
   * Process social data from spreadsheet
   */
  private processSocialSheet(sheet: any, social: any): void {
    const rows = sheet.data?.[0]?.rowData || [];
    
    rows.forEach((row: any) => {
      const values = row.values || [];
      if (values.length >= 2) {
        const metric = values[0]?.formattedValue?.toLowerCase() || '';
        const value = this.parseNumericValue(values[1]?.formattedValue);
        
        if (metric.includes('employee') && value !== null) {
          social.employeeCount = value;
        } else if (metric.includes('diversity') && value !== null) {
          if (!social.diversityMetrics) social.diversityMetrics = {};
          social.diversityMetrics.genderRatio = value;
        }
      }
    });
  }

  /**
   * Process governance data from spreadsheet
   */
  private processGovernanceSheet(sheet: any, governance: any): void {
    const rows = sheet.data?.[0]?.rowData || [];
    
    rows.forEach((row: any) => {
      const values = row.values || [];
      if (values.length >= 2) {
        const metric = values[0]?.formattedValue?.toLowerCase() || '';
        const value = this.parseNumericValue(values[1]?.formattedValue);
        
        if (metric.includes('board') && value !== null) {
          if (!governance.boardComposition) governance.boardComposition = {};
          governance.boardComposition.totalDirectors = value;
        }
      }
    });
  }

  /**
   * Extract environmental data from generic data structure
   */
  private extractEnvironmentalData(data: any): any {
    const environmental: any = {};
    
    // Look for common environmental data patterns
    Object.keys(data).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('carbon') || lowerKey.includes('emission')) {
        environmental.carbonEmissions = this.extractNumericValue(data, key);
      } else if (lowerKey.includes('energy')) {
        environmental.energyConsumption = this.extractNumericValue(data, key);
      } else if (lowerKey.includes('water')) {
        environmental.waterUsage = this.extractNumericValue(data, key);
      }
    });
    
    return environmental;
  }

  /**
   * Extract social data from generic data structure
   */
  private extractSocialData(data: any): any {
    const social: any = {};
    
    Object.keys(data).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('employee') || lowerKey.includes('staff')) {
        social.employeeCount = this.extractNumericValue(data, key);
      } else if (lowerKey.includes('diversity')) {
        social.diversityMetrics = { genderRatio: this.extractNumericValue(data, key) };
      }
    });
    
    return social;
  }

  /**
   * Extract governance data from generic data structure
   */
  private extractGovernanceData(data: any): any {
    const governance: any = {};
    
    Object.keys(data).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('board') || lowerKey.includes('director')) {
        governance.boardComposition = { totalDirectors: this.extractNumericValue(data, key) };
      } else if (lowerKey.includes('ceo') || lowerKey.includes('executive')) {
        governance.executiveCompensation = { ceoPayRatio: this.extractNumericValue(data, key) };
      }
    });
    
    return governance;
  }

  /**
   * Validate environmental metrics
   */
  private validateEnvironmentalMetrics(environmental: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (environmental.carbonEmissions !== undefined) {
      if (environmental.carbonEmissions < 0) {
        errors.push({
          field: 'environmental.carbonEmissions',
          message: 'Carbon emissions cannot be negative',
          severity: 'critical',
        });
      } else if (environmental.carbonEmissions > 1000000) {
        warnings.push({
          field: 'environmental.carbonEmissions',
          message: 'Carbon emissions seem unusually high',
          recommendation: 'Verify the unit of measurement (tons CO2e)',
        });
      }
    }

    if (environmental.energyConsumption !== undefined && environmental.energyConsumption < 0) {
      errors.push({
        field: 'environmental.energyConsumption',
        message: 'Energy consumption cannot be negative',
        severity: 'critical',
      });
    }
  }

  /**
   * Validate social metrics
   */
  private validateSocialMetrics(social: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (social.employeeCount !== undefined) {
      if (social.employeeCount < 0) {
        errors.push({
          field: 'social.employeeCount',
          message: 'Employee count cannot be negative',
          severity: 'critical',
        });
      } else if (social.employeeCount === 0) {
        warnings.push({
          field: 'social.employeeCount',
          message: 'Employee count is zero',
          recommendation: 'Verify this is correct for your organization type',
        });
      }
    }

    if (social.diversityMetrics?.genderRatio !== undefined) {
      if (social.diversityMetrics.genderRatio < 0 || social.diversityMetrics.genderRatio > 1) {
        errors.push({
          field: 'social.diversityMetrics.genderRatio',
          message: 'Gender ratio must be between 0 and 1',
          severity: 'high',
        });
      }
    }
  }

  /**
   * Validate governance metrics
   */
  private validateGovernanceMetrics(governance: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (governance.boardComposition?.totalDirectors !== undefined) {
      if (governance.boardComposition.totalDirectors < 1) {
        errors.push({
          field: 'governance.boardComposition.totalDirectors',
          message: 'Board must have at least one director',
          severity: 'critical',
        });
      }
    }

    if (governance.executiveCompensation?.ceoPayRatio !== undefined) {
      if (governance.executiveCompensation.ceoPayRatio < 1) {
        warnings.push({
          field: 'governance.executiveCompensation.ceoPayRatio',
          message: 'CEO pay ratio is less than 1',
          recommendation: 'Verify this calculation is correct',
        });
      }
    }
  }

  /**
   * Calculate ESG compliance score (0-100)
   */
  private calculateESGScore(data: ESGDataSchema, errors: ValidationError[]): number {
    let score = 100;
    
    // Deduct points for critical and high severity errors
    errors.forEach(error => {
      if (error.severity === 'critical') score -= 20;
      else if (error.severity === 'high') score -= 10;
      else if (error.severity === 'medium') score -= 5;
      else if (error.severity === 'low') score -= 2;
    });
    
    // Bonus points for complete data
    const dataCompleteness = this.calculateDataCompleteness(data);
    score += dataCompleteness * 10;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate data completeness percentage
   */
  private calculateDataCompleteness(data: ESGDataSchema): number {
    let totalFields = 0;
    let filledFields = 0;
    
    // Count environmental fields
    Object.keys(data.environmental).forEach(key => {
      totalFields++;
      if (data.environmental[key as keyof typeof data.environmental] !== undefined) {
        filledFields++;
      }
    });
    
    // Count social fields
    Object.keys(data.social).forEach(key => {
      totalFields++;
      if (data.social[key as keyof typeof data.social] !== undefined) {
        filledFields++;
      }
    });
    
    // Count governance fields
    Object.keys(data.governance).forEach(key => {
      totalFields++;
      if (data.governance[key as keyof typeof data.governance] !== undefined) {
        filledFields++;
      }
    });
    
    return totalFields > 0 ? filledFields / totalFields : 0;
  }

  /**
   * Extract numeric value from data
   */
  private extractNumericValue(data: any, key: string): number | undefined {
    const value = data[key];
    if (value === undefined || value === null) return undefined;
    
    const numericValue = this.parseNumericValue(value);
    return numericValue;
  }

  /**
   * Parse numeric value from various formats
   */
  private parseNumericValue(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }
}

export const esgValidationEngine = ESGValidationEngine.getInstance();
