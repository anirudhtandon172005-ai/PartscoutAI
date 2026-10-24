import { LearnedGuardrail, PastMistakeIncident } from '../types';

export const INITIAL_PAST_MISTAKES: PastMistakeIncident[] = [
  {
    id: 'inc-2024-08',
    incidentNumber: 'INC-2024-4102',
    machineId: 'mach-rf480-line4',
    machineName: 'Krones Rotary Filler RF-480 (Line 4)',
    partNumber: 'NBB8-18GM50-E2-V1',
    manufacturer: 'Pepperl+Fuchs',
    mistakeType: 'Washdown Chemical Degradation & Moisture Ingress',
    severity: 'Critical (Line Down)',
    failureDescription:
      'Standard nickel-plated brass sensor with IP67 rating was installed downstream of capper. Exposure to daily 65°C caustic washdown (CIP 2% NaOH) corroded the plating within 14 days, shorting the 24V DC bus and shutting down Bottling Line 4 for 4.2 hours.',
    rootCause:
      'Candidate matching algorithm previously treated IP67 and IP69K as equivalent soft matches without checking machine CIP washdown metadata.',
    preventionAction:
      'Engine automatically synthesised Guardrail #GUARD-WASHDOWN: Requires IP68/IP69K rating and 316L Stainless Steel housing for all Line 4 washdown zones.',
    reportedBy: 'Marcus Vance (Lead Reliability Engineer)',
    reportedDate: '2024-08-14 16:42:00',
    status: 'Guarded & Prevented',
    guardrailId: 'guard-washdown-cip-ip69k',
    preventionCount: 14,
  },
  {
    id: 'inc-2024-11',
    incidentNumber: 'INC-2024-5890',
    machineId: 'mach-rf480-line4',
    machineName: 'Krones Rotary Filler RF-480 (Line 4)',
    partNumber: 'Bi8U-M18-AP6X-H1141',
    manufacturer: 'Turck',
    mistakeType: 'Mounting Plate Clearance & Locknut Thread Deficit',
    severity: 'High',
    failureDescription:
      'Sensor body length of 52mm (38mm threaded) arrived on site. The Line 4 capper mounting bracket is 25mm thick with anti-vibration rubber isolation. Only 1.5 threads remained, preventing the jam nut from locking. The sensor vibrated loose during production ramp-up.',
    rootCause:
      'Dimensional matching validated M18 thread diameter correctly but overlooked minimum threaded barrel length relative to machine bracket thickness.',
    preventionAction:
      'Engine automatically synthesised Guardrail #GUARD-CLEARANCE: Enforces minimum 42mm threaded length for capper proximity stations.',
    reportedBy: 'David Kester (Senior Maintenance Tech)',
    reportedDate: '2024-11-03 11:15:00',
    status: 'Guarded & Prevented',
    guardrailId: 'guard-min-thread-length-40mm',
    preventionCount: 9,
  },
  {
    id: 'inc-2025-02',
    incidentNumber: 'INC-2025-1024',
    machineId: 'mach-rf480-line4',
    machineName: 'Apex PackWorks - Main Plant (Building B)',
    partNumber: 'BES 516-325-G-E5-C-S4',
    manufacturer: 'Radwell Surplus Index',
    mistakeType: 'Ghost Inventory & Stale Surplus Feed Cancellation',
    severity: 'High',
    failureDescription:
      'Urgent line-down purchase order was issued based on an unverified 38-hour-old surplus crawler record claiming 3 units in stock. Vendor cancelled the PO 16 hours later stating goods were sold offline.',
    rootCause:
      'Procurement ranking prioritized lowest price surplus without penalizing unverified inventory feeds exceeding a 12-hour freshness window.',
    preventionAction:
      'Engine automatically synthesised Guardrail #GUARD-STALE-STOCK: Demotes and penalizes surplus stock offers older than 12 hours on critical line-down urgency.',
    reportedBy: 'Elena Gomez (Technical Procurement Lead)',
    reportedDate: '2025-02-18 09:30:00',
    status: 'Guarded & Prevented',
    guardrailId: 'guard-surplus-freshness-threshold',
    preventionCount: 7,
  },
  {
    id: 'inc-2025-05',
    incidentNumber: 'INC-2025-3419',
    machineId: 'mach-kuka-cell2',
    machineName: 'KUKA KR 16 R2010 (Robotic Cell 2)',
    partNumber: 'E2B-M18KN16-WZ-C1',
    manufacturer: 'Omron Automation',
    mistakeType: 'Electrical Output Polarity Inversion (NPN Sinking)',
    severity: 'Critical (Line Down)',
    failureDescription:
      'Candidate search recommended an M18 sensor with NPN sinking transistor output. The KUKA robotic vacuum gripper controller utilizes Siemens S7-1500 digital input cards configured strictly for PNP sourcing (+24V). Gripper state failed to register, triggering emergency stop.',
    rootCause:
      'Search allowed non-PNP output because generic search prompt did not explicitly hard-constrain polarity.',
    preventionAction:
      'Engine automatically synthesised Guardrail #GUARD-PNP-POLARITY: Hard-rejects any candidate lacking confirmed PNP Normally Open output for Plant B4 control systems.',
    reportedBy: 'Marcus Vance (Lead Reliability Engineer)',
    reportedDate: '2025-05-22 14:05:00',
    status: 'Guarded & Prevented',
    guardrailId: 'guard-strict-pnp-polarity',
    preventionCount: 18,
  },
  {
    id: 'inc-2025-09',
    incidentNumber: 'INC-2025-7811',
    machineId: 'mach-hydra-ext1',
    machineName: 'Battenfeld-Cincinnati solEX 75-40 Extruder',
    partNumber: 'IME18-08BPSZC0S',
    manufacturer: 'SICK AG',
    mistakeType: 'Sensing Face Moisture Absorption Drift',
    severity: 'Medium',
    failureDescription:
      'Sensor with Polyamide (PA 66) sensing face experienced dielectric shift after exposure to cooling water mist in profile extrusion chamber. Operating distance drifted from 8mm to 5.5mm, causing intermittent missing-pulse alarms.',
    rootCause:
      'Material specification did not distinguish between hygroscopic polymers (PA 66) and hydrophobic engineering thermoplastics (PEEK / PBT).',
    preventionAction:
      'Engine automatically synthesised Guardrail #GUARD-FACE-MATERIAL: Flags PA 66 face materials in wet cooling/washdown environments in favor of PEEK or PBT.',
    reportedBy: 'Stefan Meyer (Controls Specialist)',
    reportedDate: '2025-09-09 10:20:00',
    status: 'Guarded & Prevented',
    guardrailId: 'guard-pbt-peek-face-material',
    preventionCount: 5,
  },
];

export const INITIAL_GUARDRAILS: LearnedGuardrail[] = [
  {
    id: 'guard-washdown-cip-ip69k',
    title: 'CIP Caustic Washdown Enclosure & 316L Alloy Mandate',
    category: 'Environmental Washdown',
    targetMachineId: 'mach-rf480-line4',
    targetMachineName: 'Krones Rotary Filler RF-480 (Line 4)',
    ruleCondition:
      'IF machine is subject to CIP 65°C washdown, REJECT candidates with Ingress Protection < IP68/IP69K OR non-stainless steel housings.',
    penaltyPoints: 35,
    blockPart: true,
    preventedMistakeCount: 14,
    originIncidentId: 'inc-2024-08',
    incidentSummary: 'Prevented repeat of INC-2024-4102: Caustic washdown ingress destroyed IP67 sensor in 14 days.',
    dateLearned: '2024-08-15',
    active: true,
  },
  {
    id: 'guard-min-thread-length-40mm',
    title: 'Minimum Threaded Barrel Clearance (Capper Mount >= 42mm)',
    category: 'Mechanical Clearance',
    targetMachineId: 'mach-rf480-line4',
    targetMachineName: 'Krones Rotary Filler RF-480 (Line 4)',
    ruleCondition:
      'IF candidate threaded barrel length < 42mm, FLAG review alert for 25mm mounting plate jam nut engagement.',
    penaltyPoints: 18,
    blockPart: false,
    preventedMistakeCount: 9,
    originIncidentId: 'inc-2024-11',
    incidentSummary: 'Prevented repeat of INC-2024-5890: 38mm thread lacked depth for dual locknut fastening.',
    dateLearned: '2024-11-04',
    active: true,
  },
  {
    id: 'guard-surplus-freshness-threshold',
    title: 'Stale Surplus Inventory Lockout (< 12h for Line-Down)',
    category: 'Supplier Reliability',
    ruleCondition:
      'IF urgency is "Line Down (Critical)", PENALIZE unverified independent surplus stock older than 12 hours by -25 points.',
    penaltyPoints: 25,
    blockPart: false,
    preventedMistakeCount: 7,
    originIncidentId: 'inc-2025-02',
    incidentSummary: 'Prevented repeat of INC-2025-1024: 38-hour stale listing led to cancelled PO during emergency downtime.',
    dateLearned: '2025-02-19',
    active: true,
  },
  {
    id: 'guard-strict-pnp-polarity',
    title: 'Hard Rejection of Inverted NPN Polarity (Siemens S7 PLC)',
    category: 'Electrical Polarity',
    ruleCondition:
      'HARD-BLOCK any candidate output that is NPN (Sinking) or unconfirmed polarity for Plant B4 digital inputs.',
    penaltyPoints: 100,
    blockPart: true,
    preventedMistakeCount: 18,
    originIncidentId: 'inc-2025-05',
    incidentSummary: 'Prevented repeat of INC-2025-3419: NPN output caused robotic gripper crash on S7-1500 controller.',
    dateLearned: '2025-05-23',
    active: true,
  },
  {
    id: 'guard-pbt-peek-face-material',
    title: 'Hygroscopic Face Material Warning (PA 66 vs PEEK/PBT)',
    category: 'Environmental Washdown',
    ruleCondition:
      'IF candidate sensing face uses Polyamide (PA 66), DEDUCT 10 points and flag moisture drift review in wet zones.',
    penaltyPoints: 10,
    blockPart: false,
    preventedMistakeCount: 5,
    originIncidentId: 'inc-2025-09',
    incidentSummary: 'Prevented repeat of INC-2025-7811: PA 66 water absorption caused 2.5mm trigger distance drift.',
    dateLearned: '2025-09-10',
    active: true,
  },
];
