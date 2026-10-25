import React, { useState } from 'react';
import { ComponentItem } from '../types';
import {
  RANKING_PARAMETERS,
  evaluate15Parameters,
  Candidate15AuditResult,
  RankingParameter,
} from '../data/rankingParameters';
import {
  X,
  Award,
  Cpu,
  Building2,
  Layers,
  DollarSign,
  Boxes,
  Truck,
  ShieldCheck,
  FileText,
  Clock,
  CheckSquare,
  Zap,
  Thermometer,
  RotateCcw,
  Activity,
  CheckCircle2,
  Info,
  Scale,
} from 'lucide-react';

interface RankingAuditModalProps {
  candidate: ComponentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RankingAuditModal: React.FC<RankingAuditModalProps> = ({
  candidate,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'Technical & Engineering' | 'Commercial & Logistics' | 'Data Quality & Provenance'>('all');

  if (!isOpen || !candidate) return null;

  const audit: Candidate15AuditResult = evaluate15Parameters(candidate);

  const getParamIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cpu': return <Cpu size={16} className="text-teal" />;
      case 'Building2': return <Building2 size={16} className="text-teal" />;
      case 'Layers': return <Layers size={16} className="text-teal" />;
      case 'DollarSign': return <DollarSign size={16} className="text-teal" />;
      case 'Boxes': return <Boxes size={16} className="text-teal" />;
      case 'Truck': return <Truck size={16} className="text-teal" />;
      case 'ShieldCheck': return <ShieldCheck size={16} className="text-teal" />;
      case 'FileText': return <FileText size={16} className="text-teal" />;
      case 'Clock': return <Clock size={16} className="text-teal" />;
      case 'CheckSquare': return <CheckSquare size={16} className="text-teal" />;
      case 'Zap': return <Zap size={16} className="text-teal" />;
      case 'Thermometer': return <Thermometer size={16} className="text-teal" />;
      case 'RotateCcw': return <RotateCcw size={16} className="text-teal" />;
      case 'Award': return <Award size={16} className="text-teal" />;
      case 'Activity': return <Activity size={16} className="text-teal" />;
      default: return <Scale size={16} className="text-teal" />;
    }
  };

  const filteredResults = audit.results.filter(
    r => activeTab === 'all' || r.parameter.category === activeTab
  );

  return (
    <div className="drawer-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="ranking-audit-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #0b1120 0%, #0f172a 100%)',
          color: '#f8fafc',
          width: '94%',
          maxWidth: '1060px',
          maxHeight: '90vh',
          borderRadius: '16px',
          border: '1px solid rgba(45, 212, 191, 0.35)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(20, 184, 166, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          margin: 'auto',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.85)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  background: 'rgba(13, 148, 136, 0.2)',
                  border: '1px solid #14b8a6',
                  color: '#2dd4bf',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                15 PARAMETERS EVALUATED • 100% TOTAL WEIGHT
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                Engineering Verification Standard
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              15-Parameter Ranking Audit: {candidate.manufacturer} {candidate.partNumber}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(51, 65, 85, 0.4)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: '#e2e8f0',
              borderRadius: '8px',
              padding: '0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Subheader: Category Score Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1.25rem 1.75rem',
            background: 'rgba(30, 41, 59, 0.45)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
          {/* Total Overall Score */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1px solid rgba(45, 212, 191, 0.4)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#0d9488',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.15rem',
                fontFamily: 'monospace',
                boxShadow: '0 0 16px rgba(45, 212, 191, 0.4)',
              }}
            >
              {audit.totalScore}%
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                Overall Ranking Score
              </span>
              <strong style={{ fontSize: '1rem', color: '#ffffff' }}>
                {audit.totalScore} / 100 Points
              </strong>
            </div>
          </div>

          {/* Technical & Engineering */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                Technical & Engineering (46%)
              </span>
              <strong style={{ fontSize: '0.85rem', color: '#5eead4' }}>
                {audit.categoryTotals['Technical & Engineering'].points} / 46.0 pts
              </strong>
            </div>
            <div style={{ height: '6px', background: 'rgba(51, 65, 85, 0.6)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${audit.categoryTotals['Technical & Engineering'].percent}%`,
                  background: '#14b8a6',
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.35rem', display: 'block' }}>
              6 Parameters • Compatibility, Specs, Reliability
            </span>
          </div>

          {/* Commercial & Logistics */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                Commercial & Logistics (30%)
              </span>
              <strong style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                {audit.categoryTotals['Commercial & Logistics'].points} / 30.0 pts
              </strong>
            </div>
            <div style={{ height: '6px', background: 'rgba(51, 65, 85, 0.6)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${audit.categoryTotals['Commercial & Logistics'].percent}%`,
                  background: '#38bdf8',
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.35rem', display: 'block' }}>
              5 Parameters • Price, Stock, Lead Time, Reputation
            </span>
          </div>

          {/* Data Quality & Provenance */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                Data Quality & Provenance (24%)
              </span>
              <strong style={{ fontSize: '0.85rem', color: '#a78bfa' }}>
                {audit.categoryTotals['Data Quality & Provenance'].points} / 24.0 pts
              </strong>
            </div>
            <div style={{ height: '6px', background: 'rgba(51, 65, 85, 0.6)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${audit.categoryTotals['Data Quality & Provenance'].percent}%`,
                  background: '#a78bfa',
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.35rem', display: 'block' }}>
              4 Parameters • Freshness, Evidence, Credibility
            </span>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1.75rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            background: 'rgba(15, 23, 42, 0.4)',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'all' ? '1px solid #14b8a6' : '1px solid rgba(148, 163, 184, 0.2)',
              background: activeTab === 'all' ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
              color: activeTab === 'all' ? '#2dd4bf' : '#94a3b8',
            }}
          >
            All 15 Parameters (100% Weight)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Technical & Engineering')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'Technical & Engineering' ? '1px solid #14b8a6' : '1px solid rgba(148, 163, 184, 0.2)',
              background: activeTab === 'Technical & Engineering' ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
              color: activeTab === 'Technical & Engineering' ? '#2dd4bf' : '#94a3b8',
            }}
          >
            Technical & Engineering (6 Params • 46%)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Commercial & Logistics')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'Commercial & Logistics' ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.2)',
              background: activeTab === 'Commercial & Logistics' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'Commercial & Logistics' ? '#38bdf8' : '#94a3b8',
            }}
          >
            Commercial & Logistics (5 Params • 30%)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Data Quality & Provenance')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'Data Quality & Provenance' ? '1px solid #a78bfa' : '1px solid rgba(148, 163, 184, 0.2)',
              background: activeTab === 'Data Quality & Provenance' ? 'rgba(167, 139, 250, 0.2)' : 'transparent',
              color: activeTab === 'Data Quality & Provenance' ? '#a78bfa' : '#94a3b8',
            }}
          >
            Data Quality & Provenance (4 Params • 24%)
          </button>
        </div>

        {/* Body: Parameter Audit Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredResults.map((item) => {
              const p = item.parameter;
              return (
                <div
                  key={p.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    display: 'grid',
                    gridTemplateColumns: '40px 1.8fr 1.6fr 150px',
                    alignItems: 'center',
                    gap: '1.25rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Parameter Number & Icon */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      color: '#38bdf8',
                    }}
                  >
                    #{p.number}
                  </div>

                  {/* Parameter Info & What We Evaluate */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      {getParamIcon(p.icon)}
                      <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{p.name}</strong>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          background: 'rgba(13, 148, 136, 0.2)',
                          color: '#2dd4bf',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}
                      >
                        {p.weight}% Weight
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>
                      <strong>What we evaluate:</strong> {p.whatWeEvaluate}
                    </p>
                  </div>

                  {/* Finding for this part */}
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#cbd5e1',
                      background: 'rgba(30, 41, 59, 0.5)',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      borderLeft: '3px solid #14b8a6',
                      lineHeight: 1.4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      <CheckCircle2 size={13} className="text-teal" />
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#2dd4bf', fontWeight: 700 }}>
                        Audit Finding
                      </span>
                    </div>
                    {item.finding}
                  </div>

                  {/* Score & Points */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: '0.35rem' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#ffffff', fontFamily: 'monospace' }}>
                        {item.score}%
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#2dd4bf', fontWeight: 600 }}>
                        +{item.weightedScore} pts
                      </span>
                    </div>
                    <div
                      style={{
                        height: '5px',
                        background: 'rgba(51, 65, 85, 0.6)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '0.35rem',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${item.score}%`,
                          background: item.score >= 95 ? '#14b8a6' : item.score >= 85 ? '#38bdf8' : '#fbbf24',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                      Max: {p.weight}.00 pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
            <Info size={15} className="text-teal" />
            <span>
              All 15 parameters strictly sum to 100% total weight across Technical (46%), Commercial (30%), and Provenance (24%).
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            <span>Close Audit Review</span>
          </button>
        </div>
      </div>
    </div>
  );
};
