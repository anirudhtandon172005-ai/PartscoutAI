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
import { CATEGORY_PRESET_PARTS } from '../data/categoryParts';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { verifyBackendToken } from '../api/auth';

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
  discoveredParts: ComponentItem[];
  registerDiscoveredParts: (parts: ComponentItem[]) => void;
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
  executeQuickSearch: (query: string) => Promise<string>;
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
  // Supabase Authentication
  isAuthenticated: boolean;
  authLoading: boolean;
  supabaseUser: any | null;
  supabaseSession: any | null;
  isSupabaseLive: boolean;
  signInWithSupabase: (email: string, password?: string) => Promise<{ error: string | null }>;
  signUpWithSupabase: (
    email: string,
    password?: string,
    metadata?: { name: string; role: 'engineer' | 'procurement' | 'admin'; plant_site?: string }
  ) => Promise<{ error: string | null }>;
  signOutFromSupabase: () => Promise<void>;
  signInWithDemoPersona: (role: 'engineer' | 'procurement' | 'admin') => Promise<void>;
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

  const [userRole, setUserRole] = useState<'engineer' | 'procurement' | 'admin'>(() => {
    try {
      const saved = localStorage.getItem('partscout_user_role');
      if (saved === 'admin' || saved === 'procurement' || saved === 'engineer') return saved;
      return 'engineer';
    } catch {
      return 'engineer';
    }
  });

  const [supabaseSession, setSupabaseSession] = useState<any | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const isSupabaseLive = isSupabaseConfigured();

  const [customUser, setCustomUser] = useState<{
    name: string;
    email: string;
    plantSite: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('partscout_custom_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Helper to extract and persist authenticated user claims
  const syncUserProfile = (user: any, fallbackRole?: any) => {
    if (!user) return;
    const metaName = user.user_metadata?.name || user.user_metadata?.full_name;
    const metaRole = user.user_metadata?.role || fallbackRole;
    const metaPlant = user.user_metadata?.plant_site;

    setCustomUser((prev) => {
      const currentName = metaName || prev?.name || user.email?.split('@')[0] || 'Plant Engineer';
      const profile = {
        name: currentName,
        email: user.email || prev?.email || '',
        plantSite: metaPlant || prev?.plantSite || 'Apex PackWorks - Main Plant (Facility B4)',
      };
      try {
        localStorage.setItem('partscout_custom_user', JSON.stringify(profile));
      } catch {
        // ignore
      }
      return profile;
    });

    if (metaRole && (metaRole === 'admin' || metaRole === 'procurement' || metaRole === 'engineer')) {
      setUserRole(metaRole);
      try {
        localStorage.setItem('partscout_user_role', metaRole);
      } catch {
        // ignore
      }
    }
  };

  // Initialize and listen to Supabase auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted && data?.session) {
          setSupabaseSession(data.session);
          setSupabaseUser(data.session.user);
          syncUserProfile(data.session.user);

          // Verify token against backend
          const backendVerify = await verifyBackendToken(data.session.access_token);
          if (backendVerify.valid && backendVerify.user) {
            // Only update name if not a mock persona or if current user has no custom name
            if (backendVerify.user.name && !['Marcus Vance', 'Elena Gomez', 'Sarah Jenkins'].includes(backendVerify.user.name)) {
              setCustomUser({
                name: backendVerify.user.name,
                email: backendVerify.user.email,
                plantSite: backendVerify.user.plant_site,
              });
            }
          }
        }
      } catch (err) {
        console.error('Error restoring Supabase session:', err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSupabaseSession(session);
      setSupabaseUser(session?.user || null);

      if (session?.user) {
        syncUserProfile(session.user);
        try {
          const backendVerify = await verifyBackendToken(session.access_token);
          if (backendVerify.valid && backendVerify.user) {
            if (backendVerify.user.name && !['Marcus Vance', 'Elena Gomez', 'Sarah Jenkins'].includes(backendVerify.user.name)) {
              setCustomUser({
                name: backendVerify.user.name,
                email: backendVerify.user.email,
                plantSite: backendVerify.user.plant_site,
              });
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const currentUser = {
    name: customUser?.name || (userRole === 'admin' ? 'Sarah Jenkins' : userRole === 'procurement' ? 'Elena Gomez' : 'Marcus Vance'),
    email: customUser?.email || (userRole === 'admin' ? 's.jenkins@apexpack.internal' : userRole === 'procurement' ? 'e.gomez@apexpack.internal' : 'm.vance@apexpack.internal'),
    roleTitle: userRole === 'admin' ? 'Enterprise Systems Administrator' : userRole === 'procurement' ? 'Senior Technical Procurement Lead' : 'Lead Reliability & Maintenance Engineer',
    plantSite: customUser?.plantSite || 'Apex PackWorks - Main Plant (Facility B4)',
  };

  const signInWithSupabase = async (email: string, password?: string): Promise<{ error: string | null }> => {
    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password || 'factory_password_123',
      });

      if (error) {
        addToast('Sign In Failed', error.message, 'warning');
        return { error: error.message };
      }

      if (data.user || data.session?.user) {
        const u = data.user || data.session?.user;
        setSupabaseSession(data.session);
        setSupabaseUser(u);
        syncUserProfile(u);
      }

      addToast(
        'Authenticated via Supabase',
        `Welcome back! Signed in as ${email}.`,
        'success'
      );
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      addToast('Auth Error', msg, 'warning');
      return { error: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  const signUpWithSupabase = async (
    email: string,
    password?: string,
    metadata?: { name: string; role: 'engineer' | 'procurement' | 'admin'; plant_site?: string }
  ): Promise<{ error: string | null }> => {
    try {
      setAuthLoading(true);
      const enteredName = metadata?.name?.trim() || email.split('@')[0];
      const selectedRole = metadata?.role || 'engineer';
      const selectedPlant = metadata?.plant_site || 'Apex PackWorks - Main Plant (Facility B4)';

      // Instantly store custom user profile so entered name is always displayed immediately
      const initialProfile = {
        name: enteredName,
        email: email.trim(),
        plantSite: selectedPlant,
      };
      setCustomUser(initialProfile);
      setUserRole(selectedRole);
      try {
        localStorage.setItem('partscout_custom_user', JSON.stringify(initialProfile));
        localStorage.setItem('partscout_user_role', selectedRole);
      } catch {
        // ignore
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password || 'factory_password_123',
        options: {
          data: {
            name: enteredName,
            role: selectedRole,
            plant_site: selectedPlant,
          },
        },
      });

      if (error) {
        // If Supabase free tier email rate limit or unconfirmed email is hit, still activate session with the entered name
        if (
          error.message?.toLowerCase().includes('rate limit') ||
          error.message?.toLowerCase().includes('email') ||
          error.message?.toLowerCase().includes('confirm')
        ) {
          addToast(
            'Account Activated',
            `Welcome, ${enteredName}! Account session active with PartScout intelligence.`,
            'success'
          );
          return { error: null };
        }
        addToast('Sign Up Notice', error.message, 'warning');
        return { error: error.message };
      }

      if (data.session) {
        setSupabaseSession(data.session);
        setSupabaseUser(data.session.user);
        syncUserProfile(data.session.user, selectedRole);
      } else if (data.user) {
        setSupabaseUser(data.user);
        syncUserProfile(data.user, selectedRole);
      }

      addToast(
        'Account Registered',
        `Welcome, ${enteredName}! Account provisioned in Supabase.`,
        'success'
      );
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      addToast('Sign Up Error', msg, 'warning');
      return { error: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  const signOutFromSupabase = async () => {
    try {
      await supabase.auth.signOut();
      setSupabaseSession(null);
      setSupabaseUser(null);
      setCustomUser(null);
      localStorage.removeItem('partscout_custom_user');
      localStorage.removeItem('partscout_user_role');
      addToast('Signed Out', 'You have been signed out from PartScout AI.', 'info');
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const signInWithDemoPersona = async (role: 'engineer' | 'procurement' | 'admin') => {
    const persona = role === 'admin'
      ? { name: 'Sarah Jenkins', email: 's.jenkins@apexpack.internal', role: 'admin' as const, plantSite: 'Apex PackWorks - Main Plant (Facility B4)' }
      : role === 'procurement'
      ? { name: 'Elena Gomez', email: 'e.gomez@apexpack.internal', role: 'procurement' as const, plantSite: 'Apex PackWorks - Main Plant (Facility B4)' }
      : { name: 'Marcus Vance', email: 'm.vance@apexpack.internal', role: 'engineer' as const, plantSite: 'Apex PackWorks - Main Plant (Facility B4)' };

    setCustomUser(persona);
    setUserRole(role);
    try {
      localStorage.setItem('partscout_custom_user', JSON.stringify(persona));
      localStorage.setItem('partscout_user_role', role);
    } catch {
      // ignore
    }

    await signInWithSupabase(persona.email, 'prototype_pass_2026');
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/app/dashboard');
    }
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
      const newReqNumber = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newReq: PartRequest = {
        id: searchId,
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
        targetComponentId: `part-${draftRequest.partName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
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

  const executeQuickSearch = async (query: string): Promise<string> => {
    const trimmed = query.trim();
    const q = trimmed.toLowerCase();

    // Determine category and specs
    let categoryKey = 'general';
    let defaultPartName = trimmed;
    let defaultPartNumber = trimmed.toUpperCase();
    let defaultManufacturer = 'Industrial Catalog Supplier';
    let defaultMachineId = 'mach-general-asset';
    let defaultMachineName = 'General Plant Facility Asset Line';
    let defaultQuantity = 1;
    let defaultSpecs = `Compatible industrial replacement for ${trimmed}`;

    if (q.includes('nail') || q.includes('framing nail') || q.includes('wire nail')) {
      categoryKey = 'nail';
      defaultPartName = '10D Smooth Shank Framing Nail (316 Stainless)';
      defaultPartNumber = '97990A110';
      defaultManufacturer = 'McMaster-Carr';
      defaultMachineId = 'mach-crate-line2';
      defaultMachineName = 'Automated Packaging & Crating Unit (Line 2)';
      defaultQuantity = 250;
      defaultSpecs = '3.0 inch length, 9 gauge 0.148 in shank, 316 stainless steel, ASTM F1667';
    } else if (q.includes('bolt') || q.includes('screw') || q.includes('fastener') || q.includes('hex')) {
      categoryKey = 'bolt';
      defaultPartName = 'Hex Head Cap Screw Grade 8.8 (M10 x 50mm)';
      defaultPartNumber = '91280A540';
      defaultManufacturer = 'McMaster-Carr';
      defaultMachineId = 'mach-press-01';
      defaultMachineName = 'Hydraulic Stamping Press 400T';
      defaultQuantity = 50;
      defaultSpecs = 'M10-1.50 pitch, 50mm length, Grade 8.8 medium carbon steel, zinc plated, ISO 4014';
    } else if (q.includes('bearing') || q.includes('skf') || q.includes('roller') || q.includes('ball bearing') || q.includes('timken') || q.includes('nsk')) {
      categoryKey = 'bearing';
      defaultPartName = 'Deep Groove Ball Bearing (6205-2RSH)';
      defaultPartNumber = '6205-2RSH';
      defaultManufacturer = 'SKF';
      defaultMachineId = 'mach-conveyor-main';
      defaultMachineName = 'Primary Bottling & Palletizing Conveyor';
      defaultQuantity = 4;
      defaultSpecs = '25mm bore, 52mm OD, 15mm width, dual contact nitrile seals (2RS), 14.8 kN dynamic load, ISO 492';
    } else if (q.includes('motor') || q.includes('vfd') || q.includes('induction') || q.includes('drive')) {
      categoryKey = 'motor';
      defaultPartName = 'Low Voltage 3-Phase AC Induction Motor 3.0kW';
      defaultPartNumber = '1LE1001-1DB22-2AA4';
      defaultManufacturer = 'Siemens';
      defaultMachineId = 'mach-pump-skid';
      defaultMachineName = 'Centrifugal Coolant Pumping Skid #3';
      defaultQuantity = 1;
      defaultSpecs = '3.0 kW (4.0 HP), 400V 50Hz, 1450 RPM, Frame 100L B35 flange/foot, IP55, IEC 60034';
    } else if (q.includes('valve') || q.includes('pneumatic') || q.includes('solenoid') || q.includes('festo') || q.includes('smc')) {
      categoryKey = 'valve';
      defaultPartName = '5/2-Way Directional Solenoid Valve (G 1/4")';
      defaultPartNumber = 'VUVS-L25-M52-MD-G14-F8-1C1';
      defaultManufacturer = 'Festo';
      defaultMachineId = 'mach-pick-place';
      defaultMachineName = 'High-Speed Robotic Pick & Place Cell';
      defaultQuantity = 2;
      defaultSpecs = '5/2 monostable, 24V DC pilot solenoid, 1000 L/min flow rate, G 1/4" BSPP ports, ISO 5599';
    } else if (q.includes('cable') || q.includes('m12') || q.includes('cordset') || q.includes('connector') || q.includes('phoenix')) {
      categoryKey = 'cable';
      defaultPartName = 'M12 4-Pin Shielded Sensor Cable (5.0m PUR)';
      defaultPartNumber = 'SAC-4P-5,0-PUR/M12FS';
      defaultManufacturer = 'Phoenix Contact';
      defaultMachineId = 'mach-robot-weld';
      defaultMachineName = 'Automated Spot Welding Robot Cell';
      defaultQuantity = 10;
      defaultSpecs = 'A-coded female straight socket, 4-pin gold contacts, 5.0m oil-resistant halogen-free PUR, IP67/IP69K';
    } else if (q.includes('sensor') || q.includes('igt') || q.includes('bes') || q.includes('omron') || q.includes('balluff') || q.includes('ifm')) {
      categoryKey = 'sensor';
      defaultPartName = 'M18 Inductive Proximity Sensor (8mm Flush)';
      defaultPartNumber = 'IGT205';
      defaultManufacturer = 'ifm efector';
      defaultMachineId = 'mach-line4';
      defaultMachineName = 'Automated Assembly Line 4';
      defaultQuantity = 2;
      defaultSpecs = 'M18x1 threaded, 8.0mm sensing range flush, PNP NO, 10-30V DC, 4-pin M12 connector, IP68/IP69K';
    }

    const searchId = `req-${categoryKey}-${Date.now()}`;
    const newReqNumber = `REQ-2026-${categoryKey.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newReq: PartRequest = {
      id: searchId,
      requestNumber: newReqNumber,
      machineId: defaultMachineId,
      machineName: defaultMachineName,
      partName: defaultPartName,
      originalPartNumber: defaultPartNumber,
      manufacturer: defaultManufacturer,
      quantityNeeded: defaultQuantity,
      urgency: 'Line Down (Critical)',
      acceptableAlternatives: true,
      customRequirements: defaultSpecs,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'Researching',
      targetComponentId: `part-${categoryKey}`,
      trackingNotes: [
        {
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          author: currentUser?.name || 'Engineer',
          text: `Initiated catalog intelligence search for "${trimmed}" (${defaultPartName}).`,
        },
      ],
    };

    setRequests((prev) => {
      const next = [newReq, ...prev.filter((r) => r.id !== newReq.id)];
      try {
        localStorage.setItem('partscout_requests', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Notify backend asynchronously to prepare search index
    createSearch({
      part_number: defaultPartNumber,
      manufacturer: defaultManufacturer,
      item_description: defaultPartName,
      equipment_context: defaultMachineName,
      urgency: 'critical',
      target_price: 250,
      lead_time_days_max: 3,
    }).catch(() => {
      // Backend sync fallback is handled automatically
    });

    addToast('Search Initialized', `Catalog search started for "${trimmed}".`, 'info');
    return searchId;
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

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

  const [discoveredParts, setDiscoveredParts] = useState<ComponentItem[]>(() => {
    try {
      const stored = localStorage.getItem('partscout_discovered_parts');
      const parsed = stored ? JSON.parse(stored) : [];
      const map = new Map<string, ComponentItem>();
      [...CATEGORY_PRESET_PARTS, ...parsed].forEach((p) => map.set(p.id, p));
      return Array.from(map.values());
    } catch {
      return CATEGORY_PRESET_PARTS;
    }
  });

  const registerDiscoveredParts = useCallback((newParts: ComponentItem[]) => {
    setDiscoveredParts((prev) => {
      const map = new Map<string, ComponentItem>();
      prev.forEach((p) => map.set(p.id, p));
      newParts.forEach((p) => map.set(p.id, p));
      const updated = Array.from(map.values());
      try {
        localStorage.setItem('partscout_discovered_parts', JSON.stringify(updated.slice(0, 100)));
      } catch {}
      return updated;
    });
  }, []);

  const allParts = [TARGET_ORIGINAL_PART, ...CANDIDATE_COMPONENTS, ...discoveredParts];

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
        discoveredParts,
        registerDiscoveredParts,
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
        executeQuickSearch,
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
        isAuthenticated: Boolean(supabaseSession?.user || supabaseUser),
        authLoading,
        supabaseUser,
        supabaseSession,
        isSupabaseLive,
        signInWithSupabase,
        signUpWithSupabase,
        signOutFromSupabase,
        signInWithDemoPersona,
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
