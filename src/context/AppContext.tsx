import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  WorkspaceBootstrap,
  MeResponse,
  WorkspaceSummary,
  SupplierOffer,
} from '../types';
import { createSearch, SearchCreateRequest, getMe, MeResponse as ApiMeResponse, ApiRequestError } from '../api/searches';
import {
  getWorkspaceBootstrap,
  setSavedPart as persistSavedPart,
  updateRequestStatus as persistRequestStatus,
  addRequestNote as persistRequestNote,
  updateQuotationStatus as persistQuotationStatus,
  toggleSourceDomain as persistSourceDomain,
  resolveQualityIssue as persistQualityIssue,
  createWorkspaceRequest,
  createWorkspaceQuotation,
  createWorkspaceSourceDomain,
  createWorkspaceMachine,
  updateWorkspaceMachine,
  deleteWorkspaceMachine,
  createWorkspaceSupplier,
  createWorkspaceOffer,
} from '../api/workspace';
import { supabase } from '../lib/supabase';

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
  authReady: boolean;
  isAuthenticated: boolean;
  workspace: WorkspaceSummary | null;
  signOut: () => Promise<void>;
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
  addQuotation: (quote: Partial<Omit<Quotation, 'id' | 'rfqNumber' | 'quotedAt'>>) => void;
  updateQuotationStatus: (id: string, status: Quotation['status']) => void;
  toggleSourceDomain: (id: string) => void;
  addSourceDomain: (domain: Omit<SourceDomain, 'id' | 'extractedProductsCount' | 'lastCrawlTime' | 'lastCrawlStatus'>) => void;
  resolveQualityIssue: (id: string) => void;
  addMachine: (machine: Omit<Machine, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMachine: (id: string, updates: Partial<Machine>) => Promise<void>;
  deleteMachine: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addOffer: (offer: Omit<SupplierOffer, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  removeToast: (id: string) => void;
  activeEvidence: SourceEvidence | null;
  setActiveEvidence: (evidence: SourceEvidence | null) => void;
  isLoading: boolean;
  machinesLoading: boolean;
  machinesError: string | null;
  refreshWorkspaceData: () => Promise<void>;
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

// Mock data for demo/fallback
const MOCK_TARGET_PART: ComponentItem = {
  id: 'part-balluff-bes516',
  workspaceId: null,
  partNumber: 'BES 516-325-G-E5-C-S4',
  manufacturer: 'Balluff GmbH',
  name: 'M18 Shielded Inductive Proximity Sensor',
  category: 'Inductive Sensors / Automation Presence Detection',
  description: 'M18x1 cylindrical flush-mount proximity switch with PNP Normally Open switching output, 8mm operating distance, and 4-pin M12 standard connector.',
  imageUrl: null,
  datasheetUrl: 'https://example.com/datasheets/balluff-bes516.pdf',
  specifications: [],
  isOriginalTarget: true,
  matchScore: 100,
  matchConfidence: 'High',
  overallStatus: 'Drop-in Replacement',
  cadAvailable: true,
  keySpecs: {
    'Sensing Distance (Sn)': '8.0 mm',
    'Installation Type': 'Shielded / Flush Mount',
    'Thread Size': 'M18 x 1.0',
    'Housing Length': '65 mm (Threaded: 45 mm)',
    'Output Configuration': 'PNP Normally Open (NO)',
    'Operating Voltage': '10 ... 30 V DC',
    'Switching Frequency': '500 Hz',
    'Housing Material': 'Nickel-Plated Brass',
    'Sensing Face Material': 'PBT Thermoplastic',
    'Ingress Protection': 'IP67 / IP68',
    'Connector Type': 'M12x1 Male, 4-Pin',
    'Operating Temperature': '-25°C ... +70°C',
  },
  offers: [],
  evidence: [],
  uncertaintyNotes: [],
};

const MOCK_CANDIDATES: ComponentItem[] = [
  {
    id: 'part-ifm-igt205',
    workspaceId: null,
    partNumber: 'IGT205',
    manufacturer: 'ifm efector',
    name: 'M18 Flush Inductive Sensor (Full Stainless)',
    category: 'Inductive Proximity / Food & Wet Area Industrial',
    description: 'High-grade stainless steel M18 inductive proximity sensor with gold-plated 4-pin M12 connector. Designed for harsh washdown and mechanical shock resistance.',
    imageUrl: null,
    datasheetUrl: 'https://example.com/datasheets/ifm-igt205.pdf',
    specifications: [],
    matchScore: 96,
    matchConfidence: 'High',
    overallStatus: 'Drop-in Replacement',
    cadAvailable: true,
    keySpecs: {
      'Sensing Distance (Sn)': '8.0 mm',
      'Installation Type': 'Shielded / Flush Mount',
      'Thread Size': 'M18 x 1.0',
      'Housing Length': '70 mm (Threaded: 48 mm)',
      'Output Configuration': 'PNP Normally Open (NO)',
      'Operating Voltage': '10 ... 36 V DC',
      'Switching Frequency': '400 Hz',
      'Housing Material': '316L Stainless Steel (1.4404)',
      'Sensing Face Material': 'PEEK Thermoplastic',
      'Ingress Protection': 'IP68 / IP69K (High Pressure Washdown)',
      'Connector Type': 'M12x1 Male, 4-Pin Gold-Plated',
      'Operating Temperature': '-40°C ... +85°C',
    },
    offers: [],
    evidence: [],
    uncertaintyNotes: [],
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/_([a-z])/g, (_, character: string) => character.toUpperCase()),
    camelize(item),
  ]));
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Sync route with URL hash for easy bookmarking and refresh
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash.startsWith('access_token=') || hash.startsWith('error=')) {
      return '/app/dashboard';
    }
    return hash || '/';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash.startsWith('access_token=') || hash.startsWith('error=')) {
        return;
      }
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
  const [machines, setMachines] = useState<Machine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [sourceDomains, setSourceDomains] = useState<SourceDomain[]>([]);
  const [collectionJobs, setCollectionJobs] = useState<CollectionJob[]>([]);
  const [qualityIssues, setQualityIssues] = useState<DataQualityIssue[]>([]);
  const [authReady, setAuthReady] = useState(!supabase);
  const [isLoading, setIsLoading] = useState(false);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [machinesError, setMachinesError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);

  const refreshWorkspaceData = useCallback(async () => {
    const localDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
    if (!localDemoMode && (!supabase || !authUser)) return;
    setMachinesLoading(true);
    setMachinesError(null);
    try {
      const bootstrap = await getWorkspaceBootstrap();
      setMachines(bootstrap.machines);
      setSuppliers(bootstrap.suppliers);
      setCollectionJobs(bootstrap.collectionJobs);
      setRequests(bootstrap.requests);
      setQuotations(bootstrap.quotations);
      setSourceDomains(bootstrap.sourceDomains);
      setQualityIssues(bootstrap.qualityIssues);
      setSavedPartIds(bootstrap.savedPartIds);
      setMachinesLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load equipment registry.';
      setMachinesError(message);
      setMachinesLoading(false);
      console.error('Failed to refresh workspace data', error);
    }
  }, [authUser]);

  // Initialize auth and load workspace data
  useEffect(() => {
    const client = supabase;
    let mounted = true;
    if (!client) {
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        void Promise.all([getMe(), getWorkspaceBootstrap()]).then(([me, bootstrap]) => {
          if (!mounted) return;
          setWorkspace(me.workspaces[0] ?? null);
          setMachines(bootstrap.machines);
          setSuppliers(bootstrap.suppliers);
          setCollectionJobs(bootstrap.collectionJobs);
          setRequests(bootstrap.requests);
          setQuotations(bootstrap.quotations);
          setSourceDomains(bootstrap.sourceDomains);
          setQualityIssues(bootstrap.qualityIssues);
          setSavedPartIds(bootstrap.savedPartIds);
          setMachinesLoading(false);
        }).catch((error) => {
          setMachinesError(error instanceof Error ? error.message : 'Unable to load equipment registry.');
          setMachinesLoading(false);
          console.error('Failed to load local workspace context', error);
        });
      } else {
        setMachinesLoading(false);
      }
      setAuthReady(true);
      return;
    }
    const loadSession = async () => {
      const { data } = await client.auth.getSession();
      if (!mounted) return;
      setAuthUser(data.session?.user ?? null);
      if (data.session) {
        try {
          const me = await getMe();
          if (mounted) {
            setWorkspace(me.workspaces[0] ?? null);
            if (me.workspaces[0]?.role) {
              setUserRole(me.workspaces[0].role === 'admin' || me.workspaces[0].role === 'owner' ? 'admin' : me.workspaces[0].role === 'procurement' ? 'procurement' : 'engineer');
            }
          }
          const bootstrap = await getWorkspaceBootstrap();
          if (mounted) {
            setMachines(bootstrap.machines);
            setSuppliers(bootstrap.suppliers);
            setCollectionJobs(bootstrap.collectionJobs);
            setRequests(bootstrap.requests);
            setQuotations(bootstrap.quotations);
            setSourceDomains(bootstrap.sourceDomains);
            setQualityIssues(bootstrap.qualityIssues);
            setSavedPartIds(bootstrap.savedPartIds);
            setMachinesLoading(false);
          }
        } catch (error) {
          setMachinesError(error instanceof Error ? error.message : 'Unable to load equipment registry.');
          setMachinesLoading(false);
          console.error('Failed to load workspace context', error);
        }
      } else if (import.meta.env.VITE_DEMO_MODE === 'true') {
        try {
          const [me, bootstrap] = await Promise.all([getMe(), getWorkspaceBootstrap()]);
          if (mounted) {
            setWorkspace(me.workspaces[0] ?? null);
            setMachines(bootstrap.machines);
            setSuppliers(bootstrap.suppliers);
            setCollectionJobs(bootstrap.collectionJobs);
            setRequests(bootstrap.requests);
            setQuotations(bootstrap.quotations);
            setSourceDomains(bootstrap.sourceDomains);
            setQualityIssues(bootstrap.qualityIssues);
            setSavedPartIds(bootstrap.savedPartIds);
            setMachinesLoading(false);
          }
        } catch (error) {
          setMachinesError(error instanceof Error ? error.message : 'Unable to load equipment registry.');
          setMachinesLoading(false);
          console.error('Failed to load local workspace context', error);
        }
      }
      setAuthReady(true);
    };
    void loadSession();
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        setWorkspace(null);
        setMachines([]);
        setSuppliers([]);
        setRequests([]);
        setQuotations([]);
        setSourceDomains([]);
        setCollectionJobs([]);
        setQualityIssues([]);
        setSavedPartIds([]);
      } else if (session) {
        setAuthUser(session.user);
        const hasAuthHash = window.location.hash.includes('access_token=') || window.location.hash.includes('refresh_token=');
        const hasAuthQuery = window.location.search.includes('code=');
        const isAuthRoute = window.location.hash === '#/login' || window.location.hash === '#/signup' || window.location.hash === '' || window.location.hash === '#/';

        if (hasAuthHash || hasAuthQuery || isAuthRoute) {
          if (hasAuthHash || hasAuthQuery) {
            window.history.replaceState({}, document.title, window.location.pathname + '#/app/dashboard');
          }
          setCurrentRoute('/app/dashboard');
          window.location.hash = '/app/dashboard';
        }
      }
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/login');
  };

  const currentUser = {
    name: authUser?.user_metadata?.full_name || (userRole === 'admin' ? 'Sarah Jenkins' : userRole === 'procurement' ? 'Elena Gomez' : 'Marcus Vance'),
    email: authUser?.email || (userRole === 'admin' ? 's.jenkins@apexpack.internal' : userRole === 'procurement' ? 'e.gomez@apexpack.internal' : 'm.vance@apexpack.internal'),
    roleTitle: userRole === 'admin' ? 'Enterprise Systems Administrator' : userRole === 'procurement' ? 'Senior Technical Procurement Lead' : 'Lead Reliability & Maintenance Engineer',
    plantSite: 'Apex PackWorks - Main Plant (Facility B4)',
  };

  const isRemoteWorkspace = Boolean(workspace);

  // Saved parts - now from API
  const [savedPartIds, setSavedPartIds] = useState<string[]>([]);

  const toggleSavePart = (partId: string) => {
    const currentlySaved = savedPartIds.includes(partId);
    const next = currentlySaved ? savedPartIds.filter((id) => id !== partId) : [...savedPartIds, partId];
    setSavedPartIds(next);
    addToast(
      currentlySaved ? 'Removed from Saved' : 'Saved to Workspace',
      currentlySaved ? 'Component removed from your saved technical library.' : 'Component added to your saved parts for quick comparison.',
      'info'
    );
    if (isRemoteWorkspace) {
      void persistSavedPart(partId, !currentlySaved).catch((error) => {
        addToast('Save Failed', error instanceof Error ? error.message : 'Unable to persist saved part.', 'warning');
        // Revert on failure
        setSavedPartIds(savedPartIds);
      });
    }
  };

  const isPartSaved = (partId: string) => savedPartIds.includes(partId);

  // Request mutations
  const updateRequestStatus = (requestId: string, status: PartRequest['status']) => {
    setRequests((prev) => {
      const updated = prev.map((r) => (r.id === requestId ? { ...r, status } : r));
      return updated;
    });
    if (isRemoteWorkspace) {
      void persistRequestStatus(requestId, status).catch((error) => {
        addToast('Status Save Failed', error instanceof Error ? error.message : 'Unable to persist request status.', 'warning');
        refreshWorkspaceData();
      });
    }
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
      return updated;
    });
    if (isRemoteWorkspace) {
      void persistRequestNote(requestId, text.trim()).catch((error) => {
        addToast('Note Save Failed', error instanceof Error ? error.message : 'Unable to persist request note.', 'warning');
        refreshWorkspaceData();
      });
    }
    addToast('Note Recorded', 'Log entry added to part investigation timeline.', 'info');
  };

  // Draft Request Wizard State
  const [draftRequest, setDraftRequest] = useState<DraftRequestData>(defaultDraft);

  const updateDraftRequest = (updates: Partial<DraftRequestData>) => {
    setDraftRequest((prev) => ({ ...prev, ...updates }));
  };

  const resetDraftRequest = () => {
    setDraftRequest(defaultDraft);
  };

  const submitDraftRequest = async () => {
    const selectedMachine = machines.find((m) => m.id === draftRequest.machineId);
    
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
        workspaceId: workspace?.id || 'local-demo',
        machineId: draftRequest.machineId,
        requestNumber: newReqNumber,
        machineName: selectedMachine ? `${selectedMachine.model} (${selectedMachine.productionLine})` : (draftRequest.customMachineName || 'General Facility Asset'),
        partName: draftRequest.partName,
        originalPartNumber: draftRequest.originalPartNumber,
        manufacturer: draftRequest.manufacturer,
        quantityNeeded: draftRequest.quantityNeeded,
        urgency: draftRequest.urgency,
        acceptableAlternatives: draftRequest.acceptableAlternatives,
        customRequirements: draftRequest.customRequirements,
        status: 'Researching',
        targetComponentId: 'part-balluff-bes516',
        createdBy: authUser?.id || 'local',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trackingNotes: [
          {
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            author: currentUser.name,
            text: `Initiated research request for ${draftRequest.partName} (${draftRequest.originalPartNumber}) with urgency level: ${draftRequest.urgency}.`,
          },
        ],
      };

      setRequests((prev) => [newReq, ...prev]);

      if (isRemoteWorkspace) {
        await createWorkspaceRequest({
          id: newReq.id,
          requestNumber: newReq.requestNumber,
          machineId: newReq.machineId,
          machineName: newReq.machineName,
          partName: newReq.partName,
          originalPartNumber: newReq.originalPartNumber,
          manufacturer: newReq.manufacturer,
          quantityNeeded: newReq.quantityNeeded,
          urgency: newReq.urgency,
          acceptableAlternatives: newReq.acceptableAlternatives,
          customRequirements: newReq.customRequirements,
          status: newReq.status,
          targetComponentId: newReq.targetComponentId,
        }).catch((error) => {
          if (error instanceof ApiRequestError) {
            const requestRef = error.requestId ? ` Request ID: ${error.requestId}.` : '';
            addToast('Request Save Failed', `${error.message}${requestRef}`, 'warning');
          } else {
            addToast('Request Save Failed', error instanceof Error ? error.message : 'Unable to persist request.', 'warning');
          }
        });
      }

      addToast('Research Initialized', `Started intelligent discovery for ${newReqNumber}.`, 'success');
      return searchId;
    } catch (error) {
      const requestRef = error instanceof ApiRequestError && error.requestId ? ` Request ID: ${error.requestId}.` : '';
      const statusRef = error instanceof ApiRequestError ? ` (HTTP ${error.status})` : '';
      addToast('Search Failed', `Failed to initiate search${statusRef}: ${error instanceof Error ? error.message : 'Unknown error'}.${requestRef}`, 'warning');
      throw error;
    }
  };

  // Quotations
  const addQuotation = (quote: Partial<Omit<Quotation, 'id' | 'rfqNumber' | 'quotedAt'>>) => {
    const newQuote: Quotation = {
      ...quote,
      id: `quote-${Date.now()}`,
      rfqNumber: `RFQ-2026-${Math.floor(5000 + Math.random() * 4000)}`,
      quotedAt: new Date().toISOString(),
      workspaceId: workspace?.id || 'local-demo',
      createdBy: authUser?.id || 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      partRequestId: quote.partRequestId || 'req-unknown',
      supplierId: quote.supplierId || null,
      partNumber: quote.partNumber || 'Unknown',
      supplierName: quote.supplierName || 'Unknown',
      unitPrice: quote.unitPrice || 0,
      currency: quote.currency || 'USD',
      quantity: quote.quantity || 1,
      totalPrice: quote.totalPrice || 0,
      leadTimeWeeks: quote.leadTimeWeeks || 0,
      validUntil: quote.validUntil || null,
      terms: quote.terms || '',
      isOfficial: quote.isOfficial || false,
      status: quote.status || 'Pending Review',
    };
    setQuotations((prev) => [newQuote, ...prev]);
    if (isRemoteWorkspace) {
      void createWorkspaceQuotation({
        id: newQuote.id,
        partRequestId: quote.partRequestId,
        supplierId: quote.supplierId,
        partNumber: quote.partNumber,
        supplierName: quote.supplierName,
        unitPrice: quote.unitPrice,
        currency: quote.currency,
        quantity: quote.quantity,
        totalPrice: quote.totalPrice,
        leadTimeWeeks: quote.leadTimeWeeks,
        rfqNumber: newQuote.rfqNumber,
        validUntil: quote.validUntil,
        terms: quote.terms,
        isOfficial: quote.isOfficial,
        status: quote.status,
      }).catch((error) => addToast('Quotation Save Failed', error instanceof Error ? error.message : 'Unable to persist quotation.', 'warning'));
    }
    addToast('Quotation Added', `Illustrative quote from ${quote.supplierName} recorded.`, 'success');
  };

  const updateQuotationStatus = (id: string, status: Quotation['status']) => {
    setQuotations((prev) => {
      const next = prev.map((q) => (q.id === id ? { ...q, status } : q));
      return next;
    });
    if (isRemoteWorkspace) {
      void persistQuotationStatus(id, status).catch((error) => {
        addToast('Quote Save Failed', error instanceof Error ? error.message : 'Unable to persist quote status.', 'warning');
        refreshWorkspaceData();
      });
    }
    addToast('Quote Updated', `Quotation status updated to ${status}.`, 'info');
  };

  // Sources
  const toggleSourceDomain = (id: string) => {
    setSourceDomains((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
      return next;
    });
    if (isRemoteWorkspace) {
      const current = sourceDomains.find((source) => source.id === id);
      if (current) {
        void persistSourceDomain(id, !current.enabled).catch((error) => {
          addToast('Crawler Scope Save Failed', error instanceof Error ? error.message : 'Unable to persist source domain.', 'warning');
          refreshWorkspaceData();
        });
      }
    }
    addToast('Crawler Scope Updated', 'Domain crawl permission modified.', 'info');
  };

  const addSourceDomain = (domain: Omit<SourceDomain, 'id' | 'extractedProductsCount' | 'lastCrawlTime' | 'lastCrawlStatus'>) => {
    const newDomain: SourceDomain = {
      ...domain,
      id: `dom-${Date.now()}`,
      workspaceId: workspace?.id || 'local-demo',
      extractedProductsCount: 0,
      lastCrawlStatus: 'Success',
      lastCrawlTime: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSourceDomains((prev) => [...prev, newDomain]);
    if (isRemoteWorkspace) {
      void createWorkspaceSourceDomain({
        id: newDomain.id,
        name: newDomain.name,
        domain: newDomain.domain,
        category: newDomain.category,
        enabled: newDomain.enabled,
        crawlFrequency: newDomain.crawlFrequency,
        notes: newDomain.notes,
      }).catch((error) => addToast('Domain Save Failed', error instanceof Error ? error.message : 'Unable to persist source domain.', 'warning'));
    }
    addToast('Target Domain Added', `${domain.name} added to crawler target registry.`, 'success');
  };

  // Machines
  const addMachine = async (machine: Omit<Machine, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => {
    if (isRemoteWorkspace) {
      await createWorkspaceMachine({
        ...machine,
        workspaceId: workspace?.id,
      });
      await refreshWorkspaceData();
    } else {
      const newMachine: Machine = {
        ...machine,
        id: `mach-${Date.now()}`,
        workspaceId: 'local-demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setMachines((prev) => [newMachine, ...prev]);
    }
    addToast('Machine Added', `${machine.manufacturer} ${machine.model} added to registry.`, 'success');
  };

  const updateMachine = async (id: string, updates: Partial<Machine>) => {
    if (isRemoteWorkspace) {
      await updateWorkspaceMachine(id, updates);
      await refreshWorkspaceData();
    } else {
      setMachines((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m)));
    }
    addToast('Machine Updated', 'Machine record updated.', 'info');
  };

  const deleteMachine = async (id: string) => {
    if (isRemoteWorkspace) {
      await deleteWorkspaceMachine(id);
      await refreshWorkspaceData();
    } else {
      setMachines((prev) => prev.filter((m) => m.id !== id));
    }
    addToast('Machine Removed', 'Machine removed from registry.', 'info');
  };

  // Suppliers
  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => {
    if (isRemoteWorkspace) {
      await createWorkspaceSupplier({
        ...supplier,
        workspaceId: workspace?.id,
      });
      await refreshWorkspaceData();
    } else {
      const newSupplier: Supplier = {
        ...supplier,
        id: `supp-${Date.now()}`,
        workspaceId: 'local-demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSuppliers((prev) => [newSupplier, ...prev]);
    }
    addToast('Supplier Added', `${supplier.name} added to directory.`, 'success');
  };

  // Offers
  const addOffer = async (offer: Omit<SupplierOffer, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => {
    if (isRemoteWorkspace) {
      await createWorkspaceOffer({
        ...offer,
        workspaceId: workspace?.id,
      });
      await refreshWorkspaceData();
    }
    addToast('Offer Added', `Supplier offer for ${offer.partNumber} recorded.`, 'success');
  };

  // Data Quality Issues
  const resolveQualityIssue = (id: string) => {
    setQualityIssues((prev) => prev.map((q) => (q.id === id ? { ...q, resolved: true } : q)));
    if (isRemoteWorkspace) {
      void persistQualityIssue(id).catch((error) => {
        addToast('Quality Flag Save Failed', error instanceof Error ? error.message : 'Unable to persist quality issue.', 'warning');
        refreshWorkspaceData();
      });
    }
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

  const allParts = import.meta.env.VITE_DEMO_MODE === 'true'
    ? [MOCK_TARGET_PART, ...MOCK_CANDIDATES]
    : [];

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        navigate,
        userRole,
        setUserRole,
        currentUser,
        authReady,
        isAuthenticated: Boolean(authUser),
        workspace,
        signOut,
        machines,
        targetPart: MOCK_TARGET_PART,
        candidates: MOCK_CANDIDATES,
        allParts,
        requests,
        suppliers,
        quotations,
        sourceDomains,
        collectionJobs,
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
        addMachine,
        updateMachine,
        deleteMachine,
        addSupplier,
        addOffer,
        toasts,
        addToast,
        removeToast,
        activeEvidence,
        setActiveEvidence,
        isLoading,
        machinesLoading,
        machinesError,
        refreshWorkspaceData,
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
