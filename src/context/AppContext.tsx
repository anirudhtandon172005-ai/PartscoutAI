import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Machine,
  PartRequest,
  ComponentItem,
  Supplier,
  Quotation,
  SourceDomain,
  CollectionJob,
  DataQualityIssue,
  SourceEvidence,
  LearnedGuardrail,
  PastMistakeIncident,
  GuardrailEvaluationResult,
} from '../types';
import {
  MOCK_MACHINES,
  TARGET_ORIGINAL_PART,
  CANDIDATE_COMPONENTS,
  MOCK_REQUESTS,
  MOCK_SUPPLIERS,
  MOCK_QUOTATIONS,
  MOCK_SOURCE_DOMAINS,
  MOCK_COLLECTION_JOBS,
  MOCK_QUALITY_ISSUES,
} from '../data/mockData';
import { INITIAL_GUARDRAILS, INITIAL_PAST_MISTAKES } from '../data/selfImprovingData';
import { evaluateComponentGuardrails as evaluateGuardrailsUtil } from '../utils/selfImprovingEngine';
import { createSearch, SearchCreateRequest } from '../api/searches';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export interface DraftRequestData {
  machineId: string;
  customMachineName?: string;
  customMachineModel?: string;
  partName: string;
  originalPartNumber: string;
  manufacturer: string;
  quantityNeeded: number;
  urgency: 'Line Down (Critical)' | 'Urgent (24-48h)' | 'Planned Maintenance' | 'Standard Restock';
  acceptableAlternatives: boolean;
  customRequirements: string;
  step: number; // 1: Machine, 2: Part Requirements, 3: Review
}

interface AppContextType {
  currentRoute: string;
  navigate: (route: string) => void;
  userRole: 'engineer' | 'procurement' | 'admin';
  setUserRole: (role: 'engineer' | 'procurement' | 'admin') => void;
  currentUser: {
    name: string;
    email: string;
    roleTitle: string;
    plantSite: string;
  };
  machines: Machine[];
  targetPart: ComponentItem;
  candidates: ComponentItem[];
  allParts: ComponentItem[];
  requests: PartRequest[];
  suppliers: Supplier[];
  quotations: Quotation[];
  sourceDomains: SourceDomain[];
  collectionJobs: CollectionJob[];
  qualityIssues: DataQualityIssue[];
  savedPartIds: string[];
  toggleSavePart: (partId: string) => void;
  isPartSaved: (partId: string) => boolean;
  draftRequest: DraftRequestData;
  updateDraftRequest: (updates: Partial<DraftRequestData>) => void;
  resetDraftRequest: () => void;
  submitDraftRequest: () => Promise<string>; // returns new search ID
  addRequestNote: (requestId: string, text: string) => void;
  updateRequestStatus: (requestId: string, status: PartRequest['status']) => void;
  addQuotation: (quote: Omit<Quotation, 'id' | 'rfqNumber' | 'quotedAt'>) => void;
  updateQuotationStatus: (id: string, status: Quotation['status']) => void;
  toggleSourceDomain: (id: string) => void;
  addSourceDomain: (domain: Omit<SourceDomain, 'id' | 'extractedProductsCount' | 'lastCrawlTime' | 'lastCrawlStatus'>) => void;
  resolveQualityIssue: (id: string) => void;
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  removeToast: (id: string) => void;
  activeEvidence: SourceEvidence | null;
  setActiveEvidence: (evidence: SourceEvidence | null) => void;
  // Self-Improving Loop
  guardrails: LearnedGuardrail[];
  pastMistakes: PastMistakeIncident[];
  toggleGuardrail: (id: string) => void;
  logPastMistake: (data: {
    machineId: string;
    machineName: string;
    partNumber: string;
    manufacturer: string;
    mistakeType: string;
    severity: PastMistakeIncident['severity'];
    failureDescription: string;
    rootCause: string;
    preventionAction: string;
    ruleTitle: string;
    ruleCondition: string;
    category: LearnedGuardrail['category'];
    blockPart: boolean;
    penaltyPoints: number;
  }) => void;
  resetGuardrailsToDefault: () => void;
  evaluateCandidateGuardrails: (component: ComponentItem, machineId?: string) => GuardrailEvaluationResult;
  totalMistakesPrevented: number;
}

const defaultDraft: DraftRequestData = {
  machineId: 'mach-rf480-line4',
  partName: 'M18 Shielded Inductive Proximity Sensor',
  originalPartNumber: 'BES 516-325-G-E5-C-S4',
  manufacturer: 'Balluff GmbH',
  quantityNeeded: 2,
  urgency: 'Line Down (Critical)',
  acceptableAlternatives: true,
  customRequirements: 'M18 flush mount, PNP Normally Open, 8mm sensing range, 4-pin M12 connector. High washdown IP68/IP69K preferred.',
  step: 1,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Sync route with URL hash for easy bookmarking and refresh
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#/, '');
    return hash || '/';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash && hash !== currentRoute) {
        setCurrentRoute(hash);
      } else if (!hash && currentRoute !== '/') {
        setCurrentRoute('/');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentRoute]);

  const navigate = (route: string) => {
    window.location.hash = route;
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [userRole, setUserRole] = useState<'engineer' | 'procurement' | 'admin'>('engineer');

  const currentUser = {
    name: userRole === 'admin' ? 'Sarah Jenkins' : userRole === 'procurement' ? 'Elena Gomez' : 'Marcus Vance',
    email: userRole === 'admin' ? 's.jenkins@apexpack.internal' : userRole === 'procurement' ? 'e.gomez@apexpack.internal' : 'm.vance@apexpack.internal',
    roleTitle: userRole === 'admin' ? 'Enterprise Systems Administrator' : userRole === 'procurement' ? 'Senior Technical Procurement Lead' : 'Lead Reliability & Maintenance Engineer',
    plantSite: 'Apex PackWorks - Main Plant (Facility B4)',
  };

  // Saved parts in localStorage
  const [savedPartIds, setSavedPartIds] = useState<string[]>(() => {
    try {
      const local = localStorage.getItem('partscout_saved_parts');
      return local ? JSON.parse(local) : ['part-ifm-igt205'];
    } catch {
      return ['part-ifm-igt205'];
    }
  });

  const toggleSavePart = (partId: string) => {
    setSavedPartIds((prev) => {
      const next = prev.includes(partId) ? prev.filter((id) => id !== partId) : [...prev, partId];
      try {
        localStorage.setItem('partscout_saved_parts', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      addToast(
        prev.includes(partId) ? 'Removed from Saved' : 'Saved to Workspace',
        prev.includes(partId) ? 'Component removed from your saved technical library.' : 'Component added to your saved parts for quick comparison.',
        'info'
      );
      return next;
    });
  };

  const isPartSaved = (partId: string) => savedPartIds.includes(partId);

  // Requests in localStorage
  const [requests, setRequests] = useState<PartRequest[]>(() => {
    try {
      const local = localStorage.getItem('partscout_requests');
      return local ? JSON.parse(local) : MOCK_REQUESTS;
    } catch {
      return MOCK_REQUESTS;
    }
  });

  const updateRequestStatus = (requestId: string, status: PartRequest['status']) => {
    setRequests((prev) => {
      const updated = prev.map((r) => (r.id === requestId ? { ...r, status } : r));
      localStorage.setItem('partscout_requests', JSON.stringify(updated));
      return updated;
    });
    addToast('Status Updated', `Request status changed to "${status}".`, 'success');
  };

  const addRequestNote = (requestId: string, text: string) => {
    if (!text.trim()) return;
    const newNote = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      author: `${currentUser.name} (${currentUser.roleTitle})`,
      text: text.trim(),
    };
    setRequests((prev) => {
      const updated = prev.map((r) =>
        r.id === requestId ? { ...r, trackingNotes: [newNote, ...r.trackingNotes] } : r
      );
      localStorage.setItem('partscout_requests', JSON.stringify(updated));
      return updated;
    });
    addToast('Note Recorded', 'Log entry added to part investigation timeline.', 'info');
  };

  // Draft Request Wizard State
  const [draftRequest, setDraftRequest] = useState<DraftRequestData>(() => {
    try {
      const local = localStorage.getItem('partscout_active_draft');
      return local ? JSON.parse(local) : defaultDraft;
    } catch {
      return defaultDraft;
    }
  });

  const updateDraftRequest = (updates: Partial<DraftRequestData>) => {
    setDraftRequest((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('partscout_active_draft', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const resetDraftRequest = () => {
    setDraftRequest(defaultDraft);
    localStorage.removeItem('partscout_active_draft');
  };

  const submitDraftRequest = async () => {
    const selectedMachine = MOCK_MACHINES.find((m) => m.id === draftRequest.machineId);
    
    const apiRequest: SearchCreateRequest = {
      machine_name: selectedMachine ? `${selectedMachine.model} (${selectedMachine.productionLine})` : (draftRequest.customMachineName || 'General Facility Asset'),
      part_name: draftRequest.partName,
      original_part_number: draftRequest.originalPartNumber,
      manufacturer: draftRequest.manufacturer,
      quantity: draftRequest.quantityNeeded,
      requirements: {
        mounting: draftRequest.customRequirements.includes('flush') ? 'flush' : undefined,
        output: draftRequest.customRequirements.includes('PNP') ? 'PNP normally open' : undefined,
        sensing_range_mm: draftRequest.customRequirements.includes('8mm') ? 8 : undefined,
        connector: draftRequest.customRequirements.includes('M12') ? 'M12 4-pin' : undefined,
      },
    };

    try {
      const response = await createSearch(apiRequest);
      const searchId = response.id;

      // Also create a local request record for tracking
      const newId = `req-${Date.now()}`;
      const newReqNumber = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newReq: PartRequest = {
        id: newId,
        requestNumber: newReqNumber,
        machineId: draftRequest.machineId,
        machineName: selectedMachine ? `${selectedMachine.model} (${selectedMachine.productionLine})` : (draftRequest.customMachineName || 'General Facility Asset'),
        partName: draftRequest.partName,
        originalPartNumber: draftRequest.originalPartNumber,
        manufacturer: draftRequest.manufacturer,
        quantityNeeded: draftRequest.quantityNeeded,
        urgency: draftRequest.urgency,
        acceptableAlternatives: draftRequest.acceptableAlternatives,
        customRequirements: draftRequest.customRequirements,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'Researching',
        targetComponentId: 'part-balluff-bes516',
        trackingNotes: [
          {
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            author: currentUser.name,
            text: `Initiated research request for ${draftRequest.partName} (${draftRequest.originalPartNumber}) with urgency level: ${draftRequest.urgency}.`,
          },
        ],
      };

      setRequests((prev) => {
        const next = [newReq, ...prev];
        localStorage.setItem('partscout_requests', JSON.stringify(next));
        return next;
      });

      addToast('Research Initialized', `Started intelligent discovery for ${newReqNumber}.`, 'success');
      return searchId;
    } catch (error) {
      addToast('Error', `Failed to initiate search: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warning');
      throw error;
    }
  };

  // Quotations
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    try {
      const local = localStorage.getItem('partscout_quotes');
      return local ? JSON.parse(local) : MOCK_QUOTATIONS;
    } catch {
      return MOCK_QUOTATIONS;
    }
  });

  const addQuotation = (quote: Omit<Quotation, 'id' | 'rfqNumber' | 'quotedAt'>) => {
    const newQuote: Quotation = {
      ...quote,
      id: `quote-${Date.now()}`,
      rfqNumber: `RFQ-2026-${Math.floor(5000 + Math.random() * 4000)}`,
      quotedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setQuotations((prev) => {
      const next = [newQuote, ...prev];
      localStorage.setItem('partscout_quotes', JSON.stringify(next));
      return next;
    });
    addToast('Quotation Added', `Illustrative quote from ${quote.supplierName} recorded.`, 'success');
  };

  const updateQuotationStatus = (id: string, status: Quotation['status']) => {
    setQuotations((prev) => {
      const next = prev.map((q) => (q.id === id ? { ...q, status } : q));
      localStorage.setItem('partscout_quotes', JSON.stringify(next));
      return next;
    });
    addToast('Quote Updated', `Quotation status updated to ${status}.`, 'info');
  };

  // Sources
  const [sourceDomains, setSourceDomains] = useState<SourceDomain[]>(() => {
    try {
      const local = localStorage.getItem('partscout_sources');
      return local ? JSON.parse(local) : MOCK_SOURCE_DOMAINS;
    } catch {
      return MOCK_SOURCE_DOMAINS;
    }
  });

  const toggleSourceDomain = (id: string) => {
    setSourceDomains((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
      localStorage.setItem('partscout_sources', JSON.stringify(next));
      return next;
    });
    addToast('Crawler Scope Updated', 'Domain crawl permission modified in prototype state.', 'info');
  };

  const addSourceDomain = (domain: Omit<SourceDomain, 'id' | 'extractedProductsCount' | 'lastCrawlTime' | 'lastCrawlStatus'>) => {
    const newDomain: SourceDomain = {
      ...domain,
      id: `dom-${Date.now()}`,
      extractedProductsCount: 0,
      lastCrawlStatus: 'Success',
      lastCrawlTime: 'Just now (Initialized)',
    };
    setSourceDomains((prev) => {
      const next = [...prev, newDomain];
      localStorage.setItem('partscout_sources', JSON.stringify(next));
      return next;
    });
    addToast('Target Domain Added', `${domain.name} added to crawler target registry.`, 'success');
  };

  // Data Quality Issues
  const [qualityIssues, setQualityIssues] = useState<DataQualityIssue[]>(MOCK_QUALITY_ISSUES);

  const resolveQualityIssue = (id: string) => {
    setQualityIssues((prev) => prev.map((q) => (q.id === id ? { ...q, resolved: true } : q)));
    addToast('Quality Flag Resolved', 'Discrepancy marked as validated by engineer.', 'success');
  };

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Evidence Drawer modal
  const [activeEvidence, setActiveEvidence] = useState<SourceEvidence | null>(null);

  // Self-Improving Loop State
  const [guardrails, setGuardrails] = useState<LearnedGuardrail[]>(() => {
    try {
      const local = localStorage.getItem('partscout_guardrails');
      return local ? JSON.parse(local) : INITIAL_GUARDRAILS;
    } catch {
      return INITIAL_GUARDRAILS;
    }
  });

  const [pastMistakes, setPastMistakes] = useState<PastMistakeIncident[]>(() => {
    try {
      const local = localStorage.getItem('partscout_past_mistakes');
      return local ? JSON.parse(local) : INITIAL_PAST_MISTAKES;
    } catch {
      return INITIAL_PAST_MISTAKES;
    }
  });

  const toggleGuardrail = (id: string) => {
    setGuardrails((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, active: !g.active } : g));
      try {
        localStorage.setItem('partscout_guardrails', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    const target = guardrails.find((g) => g.id === id);
    const newStatus = target ? !target.active : false;
    addToast(
      newStatus ? 'Guardrail Activated' : 'Guardrail Deactivated',
      `Self-improving constraint "${target?.title || id}" is now ${newStatus ? 'ENABLED' : 'PAUSED'}.`,
      newStatus ? 'success' : 'warning'
    );
  };

  const resetGuardrailsToDefault = () => {
    setGuardrails(INITIAL_GUARDRAILS);
    setPastMistakes(INITIAL_PAST_MISTAKES);
    localStorage.removeItem('partscout_guardrails');
    localStorage.removeItem('partscout_past_mistakes');
    addToast('Loop Reset', 'Reset all learned guardrails and mistake histories to baseline factory benchmarks.', 'info');
  };

  const logPastMistake = (data: {
    machineId: string;
    machineName: string;
    partNumber: string;
    manufacturer: string;
    mistakeType: string;
    severity: PastMistakeIncident['severity'];
    failureDescription: string;
    rootCause: string;
    preventionAction: string;
    ruleTitle: string;
    ruleCondition: string;
    category: LearnedGuardrail['category'];
    blockPart: boolean;
    penaltyPoints: number;
  }) => {
    const newIncId = `inc-${Date.now()}`;
    const newIncNumber = `INC-2026-${Math.floor(2000 + Math.random() * 8000)}`;
    const newGuardId = `guard-${Date.now()}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newGuardrail: LearnedGuardrail = {
      id: newGuardId,
      title: data.ruleTitle,
      category: data.category,
      targetMachineId: data.machineId,
      targetMachineName: data.machineName,
      ruleCondition: data.ruleCondition,
      penaltyPoints: data.penaltyPoints,
      blockPart: data.blockPart,
      preventedMistakeCount: 1,
      originIncidentId: newIncId,
      incidentSummary: `Synthesised from ${newIncNumber}: ${data.mistakeType}`,
      dateLearned: now.substring(0, 10),
      active: true,
    };

    const newIncident: PastMistakeIncident = {
      id: newIncId,
      incidentNumber: newIncNumber,
      machineId: data.machineId,
      machineName: data.machineName,
      partNumber: data.partNumber,
      manufacturer: data.manufacturer,
      mistakeType: data.mistakeType,
      severity: data.severity,
      failureDescription: data.failureDescription,
      rootCause: data.rootCause,
      preventionAction: data.preventionAction,
      reportedBy: `${currentUser.name} (${currentUser.roleTitle})`,
      reportedDate: now,
      status: 'Guarded & Prevented',
      guardrailId: newGuardId,
      preventionCount: 1,
    };

    setGuardrails((prev) => {
      const updated = [newGuardrail, ...prev];
      localStorage.setItem('partscout_guardrails', JSON.stringify(updated));
      return updated;
    });

    setPastMistakes((prev) => {
      const updated = [newIncident, ...prev];
      localStorage.setItem('partscout_past_mistakes', JSON.stringify(updated));
      return updated;
    });

    addToast(
      'Self-Improving Engine Updated',
      `Logged incident ${newIncNumber} & deployed Guardrail "${data.ruleTitle}". PartScout will prevent this mistake in future searches!`,
      'success'
    );
  };

  const evaluateCandidateGuardrails = (component: ComponentItem, machineId?: string): GuardrailEvaluationResult => {
    const selectedMachine = machineId ? MOCK_MACHINES.find((m) => m.id === machineId) : MOCK_MACHINES[0];
    return evaluateGuardrailsUtil(component, selectedMachine, guardrails);
  };

  const totalMistakesPrevented = guardrails.reduce((acc, g) => acc + (g.active ? g.preventedMistakeCount : 0), 0);

  const allParts = [TARGET_ORIGINAL_PART, ...CANDIDATE_COMPONENTS];

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        navigate,
        userRole,
        setUserRole,
        currentUser,
        machines: MOCK_MACHINES,
        targetPart: TARGET_ORIGINAL_PART,
        candidates: CANDIDATE_COMPONENTS,
        allParts,
        requests,
        suppliers: MOCK_SUPPLIERS,
        quotations,
        sourceDomains,
        collectionJobs: MOCK_COLLECTION_JOBS,
        qualityIssues,
        savedPartIds,
        toggleSavePart,
        isPartSaved,
        draftRequest,
        updateDraftRequest,
        resetDraftRequest,
        submitDraftRequest,
        addRequestNote,
        updateRequestStatus,
        addQuotation,
        updateQuotationStatus,
        toggleSourceDomain,
        addSourceDomain,
        resolveQualityIssue,
        toasts,
        addToast,
        removeToast,
        activeEvidence,
        setActiveEvidence,
        guardrails,
        pastMistakes,
        toggleGuardrail,
        logPastMistake,
        resetGuardrailsToDefault,
        evaluateCandidateGuardrails,
        totalMistakesPrevented,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
