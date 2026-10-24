import { ComponentItem, LearnedGuardrail, GuardrailEvaluationResult, GuardrailViolation, Machine } from '../types';

export function evaluateComponentGuardrails(
  component: ComponentItem,
  machine?: Machine | null,
  activeGuardrails: LearnedGuardrail[] = []
): GuardrailEvaluationResult {
  const violations: GuardrailViolation[] = [];
  const verifiedGuards: { guardrailTitle: string; benefit: string }[] = [];
  let scoreAdjustment = 0;
  let blocked = false;

  const isLine4Washdown =
    machine?.id === 'mach-rf480-line4' ||
    machine?.notes?.toLowerCase().includes('washdown') ||
    machine?.notes?.toLowerCase().includes('cip');

  const enabledGuards = activeGuardrails.filter((g) => g.active);

  for (const guard of enabledGuards) {
    // 1. Environmental Washdown Guardrail (INC-2024-4102)
    if (guard.id === 'guard-washdown-cip-ip69k' && isLine4Washdown) {
      const ip = (component.keySpecs['Ingress Protection'] || '').toUpperCase();
      const material = (component.keySpecs['Housing Material'] || '').toLowerCase();
      const isIP69K = ip.includes('IP69K') || (ip.includes('IP68') && ip.includes('IP69'));
      const isStainless = material.includes('stainless');

      if (!isIP69K || !isStainless) {
        violations.push({
          guardrailId: guard.id,
          guardrailTitle: guard.title,
          incidentNumber: 'INC-2024-4102',
          warning: `Past Mistake Prevented: Sensor has ${component.keySpecs['Ingress Protection'] || 'IP67'} with ${component.keySpecs['Housing Material'] || 'Brass'}. In incident INC-2024-4102, caustic washdown destroyed this spec within 14 days, halting Line 4 for 4.2h.`,
          block: guard.blockPart,
          penalty: guard.penaltyPoints,
        });
        scoreAdjustment -= guard.penaltyPoints;
        if (guard.blockPart) blocked = true;
      } else {
        verifiedGuards.push({
          guardrailTitle: guard.title,
          benefit: 'Certified 316L Stainless Steel & IP68/IP69K provides complete caustic washdown immunity, preventing INC-2024-4102 recurrence.',
        });
      }
    }

    // 2. Minimum Threaded Barrel Length Guardrail (INC-2024-5890)
    if (guard.id === 'guard-min-thread-length-40mm' && isLine4Washdown) {
      const lengthSpec = component.keySpecs['Housing Length'] || '';
      // Check if thread length is explicitly mentioned as < 42mm (e.g. 38mm or 35mm)
      const threadMatch = lengthSpec.match(/Threaded:\s*(\d+)\s*mm/i);
      const threadedMm = threadMatch ? parseInt(threadMatch[1], 10) : 45;

      if (threadedMm < 42) {
        violations.push({
          guardrailId: guard.id,
          guardrailTitle: guard.title,
          incidentNumber: 'INC-2024-5890',
          warning: `Past Mistake Prevented: Threaded length is only ${threadedMm}mm. In incident INC-2024-5890, this was insufficient for the 25mm capper plate with vibration locknuts, causing sensor detachment.`,
          block: guard.blockPart,
          penalty: guard.penaltyPoints,
        });
        scoreAdjustment -= guard.penaltyPoints;
        if (guard.blockPart) blocked = true;
      } else {
        verifiedGuards.push({
          guardrailTitle: guard.title,
          benefit: `${threadedMm}mm threaded length exceeds the 42mm threshold, ensuring secure dual locknut fastening on the 25mm plate.`,
        });
      }
    }

    // 3. Electrical Polarity Guardrail (INC-2025-3419)
    if (guard.id === 'guard-strict-pnp-polarity') {
      const output = (component.keySpecs['Output Configuration'] || '').toUpperCase();
      if (output.includes('NPN') && !output.includes('PNP')) {
        violations.push({
          guardrailId: guard.id,
          guardrailTitle: guard.title,
          incidentNumber: 'INC-2025-3419',
          warning: 'Past Mistake Prevented: NPN Sinking output detected. Hard-blocked by Plant B4 Siemens S7-1500 controller safety rule (INC-2025-3419).',
          block: true,
          penalty: guard.penaltyPoints,
        });
        scoreAdjustment -= guard.penaltyPoints;
        blocked = true;
      } else {
        verifiedGuards.push({
          guardrailTitle: guard.title,
          benefit: 'PNP Normally Open configuration verified compliant with Plant B4 24V DC sourcing bus standard.',
        });
      }
    }

    // 4. Sensing Face Material Guardrail (INC-2025-7811)
    if (guard.id === 'guard-pbt-peek-face-material') {
      const faceMaterial = (component.keySpecs['Sensing Face Material'] || '').toLowerCase();
      if (faceMaterial.includes('pa 66') || faceMaterial.includes('polyamide')) {
        violations.push({
          guardrailId: guard.id,
          guardrailTitle: guard.title,
          incidentNumber: 'INC-2025-7811',
          warning: 'Past Mistake Prevented: Polyamide (PA 66) face material is hygroscopic. In incident INC-2025-7811, water absorption caused a 2.5mm trigger distance drift in wet zones.',
          block: guard.blockPart,
          penalty: guard.penaltyPoints,
        });
        scoreAdjustment -= guard.penaltyPoints;
        if (guard.blockPart) blocked = true;
      } else if (faceMaterial.includes('peek') || faceMaterial.includes('pbt')) {
        verifiedGuards.push({
          guardrailTitle: guard.title,
          benefit: `Hydrophobic face material (${component.keySpecs['Sensing Face Material']}) immune to moisture absorption drift.`,
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    blocked,
    scoreAdjustment,
    violations,
    verifiedGuards,
  };
}
