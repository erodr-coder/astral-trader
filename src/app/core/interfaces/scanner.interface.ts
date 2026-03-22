/**
 * Scanner interfaces for Phase 2.
 *
 * These define the rule engine that will power the market scanner.
 * Stubbed now so the data model is complete from day one.
 */

export type ComparisonOperator = '<' | '>' | '<=' | '>=' | '==' | '!=';

/** A single condition in a scanner rule */
export interface ScannerCondition {
  indicator: string;          // 'RSI_14', 'VOLUME', 'UW_DARKPOOL_VOL', etc.
  operator: ComparisonOperator;
  value: number | string;     // number for direct comparison, string for computed ('AVG_VOLUME * 1.5')
}

/** A complete scanner rule — a set of conditions that trigger an alert */
export interface ScannerRule {
  id: string;
  name: string;
  description?: string;
  market: 'stocks' | 'crypto';
  conditions: ScannerCondition[];
  confidence: 'low' | 'medium' | 'high';
  action: 'flag' | 'flag_and_analyze' | 'auto_analyze';
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  winRate?: number;           // tracked over time
}

/** Alert generated when a rule fires */
export interface ScannerAlert {
  id: string;
  ticker: string;
  ruleName: string;
  ruleId: string;
  conditionsMet: ScannerCondition[];
  confidence: 'low' | 'medium' | 'high';
  signalConvergence: number;  // how many independent signal types align
  timestamp: Date;
  acknowledged: boolean;
  aiAnalysis?: string;        // Phase 3: linked AI analysis ID
}
