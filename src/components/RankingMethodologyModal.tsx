import React from 'react';
import { RANKING_PARAMETERS } from '../data/rankingParameters';
import { X, Award, CheckCircle2, ShieldCheck, Scale, Info } from 'lucide-react';

interface RankingMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RankingMethodologyModal: React.FC<RankingMethodologyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const totalWeight = RANKING_PARAMETERS.reduce((sum, p) => sum + p.weight, 0);

  return (
    <div className="drawer-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="ranking-methodology-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #0b1120 0%, #0f172a 100%)',
          color: '#f8fafc',
          width: '92%',
          maxWidth: '1000px',
          maxHeight: '88vh',
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
        {/* Header */}
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
                }}
              >
                OFFICIAL EVALUATION STANDARD • 100% WEIGHT
              </span>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              15 Parameters for Ranking Industrial Parts Websites & Replacements
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

        {/* Subtitle / Intro */}
        <div
          style={{
            padding: '1rem 1.75rem',
            background: 'rgba(30, 41, 59, 0.4)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            fontSize: '0.85rem',
            color: '#94a3b8',
            lineHeight: 1.5,
          }}
        >
          PartScout AI ranks alternative parts and distributor catalog portals using a rigorous 15-parameter algorithmic framework totaling exactly 100% weight. Each discovered replacement is audited against engineering, commercial, and data provenance criteria.
        </div>

        {/* Table Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0 0.4rem',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.5rem 0.75rem', width: '40px' }}>#</th>
                <th style={{ padding: '0.5rem 0.75rem', width: '25%' }}>Parameter</th>
                <th style={{ padding: '0.5rem 0.75rem', width: '12%', textAlign: 'center' }}>Weight</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>What We Evaluate</th>
                <th style={{ padding: '0.5rem 0.75rem', width: '18%' }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {RANKING_PARAMETERS.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    borderRadius: '8px',
                  }}
                >
                  <td
                    style={{
                      padding: '0.75rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#38bdf8',
                      borderTopLeftRadius: '8px',
                      borderBottomLeftRadius: '8px',
                    }}
                  >
                    {p.number}
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: '#ffffff', fontSize: '0.88rem' }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span
                      style={{
                        background: 'rgba(13, 148, 136, 0.22)',
                        border: '1px solid #14b8a6',
                        color: '#2dd4bf',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        display: 'inline-block',
                      }}
                    >
                      {p.weight}%
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.4 }}>
                    {p.whatWeEvaluate}
                  </td>
                  <td
                    style={{
                      padding: '0.75rem',
                      fontSize: '0.75rem',
                      color:
                        p.category === 'Technical & Engineering'
                          ? '#2dd4bf'
                          : p.category === 'Commercial & Logistics'
                          ? '#38bdf8'
                          : '#a78bfa',
                      borderTopRightRadius: '8px',
                      borderBottomRightRadius: '8px',
                      fontWeight: 600,
                    }}
                  >
                    {p.category}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(20, 184, 166, 0.12)', fontWeight: 700 }}>
                <td style={{ padding: '0.85rem 0.75rem', color: '#2dd4bf', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                  ✓
                </td>
                <td style={{ padding: '0.85rem 0.75rem', color: '#ffffff', fontSize: '0.95rem' }}>
                  Total Evaluation Weight
                </td>
                <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                  <span
                    style={{
                      background: '#14b8a6',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      display: 'inline-block',
                    }}
                  >
                    {totalWeight}%
                  </span>
                </td>
                <td style={{ padding: '0.85rem 0.75rem', color: '#e2e8f0', fontSize: '0.85rem' }} colSpan={2}>
                  Full 15-parameter algorithmic coverage across Technical (46%), Commercial (30%), and Provenance (24%).
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
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
            <ShieldCheck size={16} className="text-teal" />
            <span>Standardized framework applied to all crawler feeds, distributor catalogs, and candidate parts.</span>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            <span>Got It</span>
          </button>
        </div>
      </div>
    </div>
  );
};
