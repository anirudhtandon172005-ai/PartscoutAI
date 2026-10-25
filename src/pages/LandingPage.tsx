import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ThreePartViewer } from '../components/ThreePartViewer';
import { DemoBadge } from '../components/DemoBadge';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Building,
  Layers,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  Zap,
  Flame,
  FileCheck,
  Star,
  Truck,
  RotateCw,
  SlidersHorizontal,
  Package,
  TrendingDown,
  HelpCircle,
  ChevronDown,
  ShoppingBag,
  Sparkles,
  Award
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { navigate, targetPart, candidates, setActiveEvidence, addToast, executeQuickSearch } = useApp();
  const sampleCandidate = candidates[0]; // ifm IGT205

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Industrial Categories');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleHeroSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) {
      const searchId = await executeQuickSearch(searchQuery);
      navigate(`/app/results/${searchId}`);
    } else {
      navigate('/app/results/req-line4-sensor');
    }
  };

  const categories = [
    { name: 'Proximity Sensors', icon: '⚡', count: '14,200+ parts', path: '/app/results/req-line4-sensor' },
    { name: 'Photoelectric & Laser', icon: '🔦', count: '8,400+ parts', path: '/app/results/req-line4-sensor' },
    { name: 'Pneumatic Valves', icon: '💨', count: '12,900+ parts', path: '/app/results/req-line4-sensor' },
    { name: 'PLC & I/O Modules', icon: '🎛️', count: '6,700+ parts', path: '/app/results/req-line4-sensor' },
    { name: 'Motors & VFD Inverters', icon: '⚙️', count: '5,300+ parts', path: '/app/results/req-line4-sensor' },
    { name: 'Industrial Cables & M12', icon: '🔌', count: '19,100+ parts', path: '/app/results/req-line4-sensor' },
    { name: 'Bearings & Couplings', icon: '🔄', count: '22,000+ parts', path: '/app/results/req-line4-sensor' },
    { name: 'Safety Relays & Curtains', icon: '🛡️', count: '4,100+ parts', path: '/app/results/req-line4-sensor' },
  ];

  const featuredParts = [
    {
      id: 'part-ifm-igt205',
      name: 'ifm efector IGT205',
      type: 'M18 Shielded Inductive Sensor',
      matchScore: 96,
      originalPart: 'Balluff BES 516-325 Drop-in',
      supplier: 'McMaster-Carr',
      stock: 14,
      leadTime: 'Next-Day Delivery',
      price: '$148.50',
      oemPrice: '$210.00',
      rating: 4.9,
      reviews: 38,
      tags: ['Top Pick', '316L Stainless', 'IP69K Washdown'],
      specs: 'M18 × 1.0 • Sn 8mm Flush • PNP NO • 400Hz • 4-pin M12',
    },
    {
      id: 'part-turck-bi8u',
      name: 'Turck Bi8U-M18-AP6X',
      type: 'uprox+ Factor 1 Proximity Sensor',
      matchScore: 92,
      originalPart: 'Balluff BES 516-325 Compatible',
      supplier: 'Grainger Industrial',
      stock: 8,
      leadTime: '2-Day Express',
      price: '$135.20',
      oemPrice: '$195.00',
      rating: 4.8,
      reviews: 24,
      tags: ['Factor 1 Metal', 'High Speed', 'Compact 52mm'],
      specs: 'M18 × 1.0 • Sn 8mm Flush • PNP NO • 1500Hz • 4-pin M12',
    },
    {
      id: 'part-pepperl-nbb8',
      name: 'Pepperl+Fuchs NBB8-18GM50',
      type: 'Industrial Inductive Sensor',
      matchScore: 88,
      originalPart: 'Balluff BES 516 Alternative',
      supplier: 'AutomationDirect',
      stock: 31,
      leadTime: 'Same-Day Dispatch',
      price: '$92.40',
      oemPrice: '$165.00',
      rating: 4.7,
      reviews: 56,
      tags: ['Best Value', 'Fast Dispatch', 'Standard Brass'],
      specs: 'M18 × 1.0 • Sn 8mm Flush • PNP NO • 500Hz • 4-pin M12',
    },
    {
      id: 'part-sick-ime18',
      name: 'SICK IME18-08BPSZC0S',
      type: 'Standard Nickel-Plated Sensor',
      matchScore: 84,
      originalPart: 'Balluff BES 516 Alternative',
      supplier: 'RS Components',
      stock: 6,
      leadTime: '3-4 Days',
      price: '$112.00',
      oemPrice: '$178.00',
      rating: 4.6,
      reviews: 19,
      tags: ['Economical', 'Certified OEM', 'IP67 Rated'],
      specs: 'M18 × 1.0 • Sn 8mm Flush • PNP NO • 1000Hz • 4-pin M12',
    },
  ];

  const faqs = [
    {
      q: 'How does PartScout AI determine 96% or 92% replacement compatibility?',
      a: 'PartScout uses deterministic engineering parameter evaluation rather than fuzzy text matching. It cross-examines 24 discrete electrical, mechanical, and environmental parameters (mounting thread, sensing face clearance, output transistor type, voltage range, frequency, and IP washdown ratings) against verified PDF manufacturer datasheets.',
    },
    {
      q: 'Where does the pricing and inventory data come from?',
      a: 'Our crawler indexes authorized distributors (McMaster-Carr, Grainger, RS Components, Allied, AutomationDirect) and surplus stockists. Every listing shows the exact timestamp of stock verification and warns users if data is older than 24 hours.',
    },
    {
      q: 'Can our maintenance team inspect the 3D dimensions before buying?',
      a: 'Yes. Every component includes an interactive Three.js 3D CAD digital twin with millimeter dimension calipers, exploded mechanical views, and simulated target detection to verify clearances before orders are placed.',
    },
    {
      q: 'Can we integrate PartScout RFQs into SAP or existing ERP workflows?',
      a: 'Absolutely. Quotations and specification audit tables can be exported as standard CSV/PDF packages or sent directly to procurement via our built-in RFQ management module.',
    },
  ];

  return (
    <div className="landing-page-root">
      {/* 1. Global Trust & Delivery Strip (Amazon / Flipkart Prime style) */}
      <div className="landing-alert-strip">
        <div className="strip-inner">
          <div className="strip-left">
            <span className="strip-badge">
              <Zap size={12} className="text-orange" />
              EMERGENCY DISPATCH
            </span>
            <span className="strip-text">
              <strong>Factory Line-Down Protection:</strong> 14,800+ verified industrial catalog feeds • Same-day stock dispatch & deterministic datasheet audit.
            </span>
          </div>
          <div className="strip-right">
            <button
              type="button"
              className="strip-link"
              onClick={() => navigate('/app/requests/new/machine')}
            >
              <span>Launch Line 4 Emergency Scenario</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Flagship Hero Surface (Spacious, modern, furnished) */}
      <section className="hero-dark-surface">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-kicker">
              <span className="kicker-dot"></span>
              <span className="kicker-text">INDUSTRIAL REPLACEMENT & PROCUREMENT INTELLIGENCE</span>
            </div>

            <h1 className="hero-headline">
              Find drop-in factory replacements before downtime costs climb.
            </h1>

            <p className="hero-lead">
              When critical production machinery halts and OEM spares are backordered for weeks,
              PartScout AI instantly audits verified distributor inventories, compares technical tolerances
              deterministically, and verifies physical fit in interactive 3D.
            </p>

            {/* Amazon / Flipkart Style Big Omni Search Bar */}
            <form className="hero-omni-search" onSubmit={handleHeroSearch}>
              <div className="omni-category-select">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by industrial category"
                >
                  <option value="All Industrial Categories">All Categories</option>
                  <option value="Proximity Sensors">Proximity Sensors</option>
                  <option value="Photoelectric Sensors">Photoelectric Sensors</option>
                  <option value="Pneumatic Valves">Pneumatic Valves</option>
                  <option value="PLC & I/O Modules">PLC & I/O Modules</option>
                  <option value="Motors & Drives">Motors & Drives</option>
                </select>
                <ChevronDown size={14} className="category-chevron" />
              </div>

              <div className="omni-search-input-wrapper">
                <Search size={18} className="search-icon-inside" />
                <input
                  type="text"
                  placeholder="Enter OEM part # (e.g. BES 516-325, IGT205), machine model, or specification..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search industrial components"
                />
              </div>

              <button type="submit" className="omni-search-btn">
                <span>Search Catalogs</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Quick Keyword Chips */}
            <div className="hero-quick-chips">
              <span className="chips-label">Popular Searches:</span>
              <button
                type="button"
                className="chip-item"
                onClick={() => navigate('/app/results/req-line4-sensor')}
              >
                M18 Flush Proximity
              </button>
              <button
                type="button"
                className="chip-item"
                onClick={() => navigate('/app/compare/part-ifm-igt205')}
              >
                Balluff BES 516 Drop-in
              </button>
              <button
                type="button"
                className="chip-item"
                onClick={() => navigate('/app/results/req-line4-sensor')}
              >
                ifm IGT205
              </button>
              <button
                type="button"
                className="chip-item"
                onClick={() => navigate('/app/results/req-line4-sensor')}
              >
                Turck Bi8U
              </button>
            </div>

            {/* Trust Metrics Bar */}
            <div className="hero-trust-bar">
              <div className="trust-item">
                <span className="trust-val">99.4%</span>
                <span className="trust-lbl">Deterministic Match Rate</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <span className="trust-val">&lt; 15 Min</span>
                <span className="trust-lbl">Emergency Discovery Time</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <span className="trust-val">14+ Feeds</span>
                <span className="trust-lbl">Authorized Distributors</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <span className="trust-val">$48.5K/hr</span>
                <span className="trust-lbl">Average Downtime Saved</span>
              </div>
            </div>
          </div>

          {/* Upgraded 3D Component Twin Hero Anchor */}
          <div className="hero-3d-anchor">
            <ThreePartViewer
              partNumber="BES 516-325 vs IGT205"
              manufacturer="M18 Shielded Inductive CAD Digital Twin"
              highlightSpecs={true}
            />
          </div>
        </div>
      </section>

      {/* 3. Category Quick-Browse Grid (Flipkart / Amazon style category rail) */}
      <section className="category-browse-section">
        <div className="container">
          <div className="section-header-compact">
            <div>
              <span className="section-pretitle">INDUSTRIAL PRODUCT FAMILIES</span>
              <h2 className="section-title">Explore Verified Component Catalogs</h2>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/app/requests/new/machine')}
            >
              <span>Browse All Catalogs</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="category-grid">
            {categories.map((cat, i) => (
              <div
                key={i}
                className="category-card"
                onClick={() => navigate(cat.path)}
                role="button"
                tabIndex={0}
              >
                <div className="category-icon-circle">{cat.icon}</div>
                <h4 className="category-name">{cat.name}</h4>
                <span className="category-count">{cat.count}</span>
                <span className="category-arrow">
                  <ChevronRight size={14} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Real-World Line-Down Scenario Spotlight (Apex PackWorks Line 4) */}
      <section className="scenario-spotlight-section">
        <div className="container">
          <div className="scenario-card">
            <div className="scenario-badge-strip">
              <span className="badge-tag alert-red">
                <Flame size={12} /> CRITICAL LINE-DOWN EVENT
              </span>
              <span className="scenario-loc">Apex PackWorks • Bottling Facility B4 • Line 4 Capper</span>
            </div>

            <div className="scenario-body">
              <div className="scenario-details">
                <h3 className="scenario-title">
                  Krones Rotary Filler RF-480 Sensor Failure
                </h3>
                <p className="scenario-desc">
                  OEM Balluff proximity sensor failed on packaging index carousel. Factory OEM quoted
                  <strong> 4 to 6 weeks lead time</strong> on backorder. PartScout AI identified an
                  in-stock <strong>ifm efector IGT205</strong> replacement with superior 316L washdown
                  rating, available for next-day dispatch at McMaster-Carr.
                </p>

                <div className="scenario-specs-comparison">
                  <div className="scenario-spec-box original">
                    <span className="box-label">FAILED ORIGINAL OEM</span>
                    <strong className="box-part">Balluff BES 516-325-G-E5-C-S4</strong>
                    <div className="box-meta">
                      <span>Nickel-Brass • IP67 • 500Hz</span>
                      <span className="lead-tag alert-red">Backordered 4–6 Weeks</span>
                    </div>
                  </div>

                  <div className="scenario-vs-badge">VS</div>

                  <div className="scenario-spec-box candidate">
                    <span className="box-label text-teal">RECOMMENDED DROP-IN</span>
                    <strong className="box-part text-teal">ifm efector IGT205 (96% Match)</strong>
                    <div className="box-meta">
                      <span>316L Stainless • IP69K • 400Hz</span>
                      <span className="lead-tag in-stock">14 Units in Stock • Next Day</span>
                    </div>
                  </div>
                </div>

                <div className="scenario-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => navigate('/app/results/req-line4-sensor')}
                  >
                    <Search size={16} />
                    <span>View Search Results & Stock</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-lg"
                    onClick={() => navigate('/app/compare/part-ifm-igt205')}
                  >
                    <Scale size={16} />
                    <span>Inspect Side-by-Side Spec Matrix</span>
                  </button>
                </div>
              </div>

              <div className="scenario-savings-card">
                <div className="savings-badge">
                  <Sparkles size={16} /> IMPACT AUDIT
                </div>
                <div className="savings-metric">
                  <span className="metric-num">$194,000</span>
                  <span className="metric-label">Estimated Downtime Cost Prevented</span>
                </div>
                <div className="savings-divider"></div>
                <div className="savings-metric">
                  <span className="metric-num">3.5 Weeks</span>
                  <span className="metric-label">Lead Time Reduction</span>
                </div>
                <div className="savings-divider"></div>
                <div className="savings-metric">
                  <span className="metric-num">100%</span>
                  <span className="metric-label">Datasheet Evidence Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. E-Commerce Featured Replacement Catalog (Amazon/Flipkart Card Grid) */}
      <section className="featured-products-section">
        <div className="container">
          <div className="section-header-block">
            <span className="section-pretitle">VERIFIED CANDIDATE INVENTORY</span>
            <h2 className="section-title">Tested Drop-In Replacements for M18 Line 4</h2>
            <p className="section-desc">
              Deterministic compatibility scores calculated across 24 critical mechanical, electrical, and thermal parameters.
            </p>
          </div>

          <div className="products-grid">
            {featuredParts.map((part) => (
              <div key={part.id} className="product-card">
                <div className="product-card-top">
                  <div className="match-score-badge">
                    <span className="score-number">{part.matchScore}%</span>
                    <span className="score-text">Match</span>
                  </div>
                  <div className="product-tags">
                    {part.tags.map((t, idx) => (
                      <span key={idx} className="prod-tag">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="product-card-body">
                  <span className="product-category">{part.type}</span>
                  <h3 className="product-title">{part.name}</h3>
                  <span className="product-compatibility">{part.originalPart}</span>

                  <div className="product-rating-row">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className="star-filled" fill="#f59e0b" color="#f59e0b" />
                      ))}
                    </div>
                    <span className="rating-score">{part.rating}</span>
                    <span className="rating-count">({part.reviews} verified plant ratings)</span>
                  </div>

                  <div className="product-specs-box">
                    <span className="specs-line">{part.specs}</span>
                  </div>

                  <div className="product-supplier-info">
                    <div className="supplier-row">
                      <Building size={14} className="text-muted" />
                      <span className="supplier-name">{part.supplier}</span>
                    </div>
                    <div className="stock-row">
                      <span className="stock-pill in-stock">
                        <CheckCircle2 size={12} /> {part.stock} in stock
                      </span>
                      <span className="delivery-time">
                        <Truck size={13} /> {part.leadTime}
                      </span>
                    </div>
                  </div>

                  <div className="product-pricing-row">
                    <div className="pricing-left">
                      <span className="current-price">{part.price}</span>
                      <span className="oem-price">{part.oemPrice} OEM list</span>
                    </div>
                    <span className="savings-percent">Save ~29%</span>
                  </div>
                </div>

                <div className="product-card-footer">
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => navigate(`/app/compare/${part.id}`)}
                  >
                    <Scale size={14} />
                    <span>Compare Specifications</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    onClick={() => navigate(`/app/parts/${part.id}`)}
                  >
                    <span>Inspect 3D Digital Twin</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Rigorous 7-Stage Pipeline Visual */}
      <section className="workflow-section">
        <div className="container">
          <div className="section-header-block">
            <span className="section-pretitle">ENTERPRISE TECHNICAL PROCESS</span>
            <h2 className="section-title">From Machine Failure to Certified Spare in 7 Steps</h2>
            <p className="section-desc">
              PartScout AI replaces hours of frantic PDF searching and phone calls with an automated, evidence-backed workflow.
            </p>
          </div>

          <div className="workflow-grid">
            <div className="workflow-card">
              <div className="step-num">01</div>
              <h4 className="step-title">Machine Context</h4>
              <p className="step-desc">
                Input machine model, voltage, thread pitch, and washdown parameters.
              </p>
              <div className="step-pill">ISO Metric M18x1 • Sn 8mm</div>
            </div>

            <div className="workflow-card">
              <div className="step-num">02</div>
              <h4 className="step-title">Targeted Source Crawl</h4>
              <p className="step-desc">
                Crawler queries authorized distributor catalogs and manufacturer portals directly.
              </p>
              <div className="step-pill">14 Catalog Feeds Audited</div>
            </div>

            <div className="workflow-card">
              <div className="step-num">03</div>
              <h4 className="step-title">Attribute Normalization</h4>
              <p className="step-desc">
                Standardizes vendor jargon ("shielded" vs "flush", "PNP make" vs "NO") into IEC 60947.
              </p>
              <div className="step-pill">IEC 60947-5-2 Unified</div>
            </div>

            <div className="workflow-card">
              <div className="step-num">04</div>
              <h4 className="step-title">Deterministic Comparison</h4>
              <p className="step-desc">
                Rigorously evaluates critical electrical, mechanical, and thermal tolerances.
              </p>
              <div className="step-pill text-teal">Match • Mismatch • Review</div>
            </div>

            <div className="workflow-card">
              <div className="step-num">05</div>
              <h4 className="step-title">Evidence Citation</h4>
              <p className="step-desc">
                Every technical parameter is linked directly to primary PDF datasheet excerpts.
              </p>
              <div className="step-pill">1-Click PDF Snippet Audit</div>
            </div>

            <div className="workflow-card">
              <div className="step-num">06</div>
              <h4 className="step-title">Stock & Availability</h4>
              <p className="step-desc">
                Aggregates live distributor stock with freshness warnings and freight estimates.
              </p>
              <div className="step-pill text-amber">Stale Timestamp Warning</div>
            </div>

            <div className="workflow-card">
              <div className="step-num">07</div>
              <h4 className="step-title">Procurement Handoff</h4>
              <p className="step-desc">
                One-click RFQ submission, quotation side-by-side comparison, and SAP PO export.
              </p>
              <div className="step-pill">RFQ & PO Ready</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Distributor Trust Network */}
      <section className="distributor-trust-section">
        <div className="container text-center">
          <span className="section-pretitle">TRUSTED INDUSTRIAL SUPPLY NETWORK</span>
          <h3 className="trust-headline">Indexing Authorized Distributors & Surplus Repositories</h3>
          <div className="distributor-logos-row">
            <div className="dist-logo-card">
              <span className="dist-logo-name">McMaster-Carr</span>
              <span className="dist-logo-sub">Authorized Distributor</span>
            </div>
            <div className="dist-logo-card">
              <span className="dist-logo-name">Grainger</span>
              <span className="dist-logo-sub">Industrial Supply</span>
            </div>
            <div className="dist-logo-card">
              <span className="dist-logo-name">RS Components</span>
              <span className="dist-logo-sub">Global Stockist</span>
            </div>
            <div className="dist-logo-card">
              <span className="dist-logo-name">AutomationDirect</span>
              <span className="dist-logo-sub">Direct Partner</span>
            </div>
            <div className="dist-logo-card">
              <span className="dist-logo-name">Allied Electronics</span>
              <span className="dist-logo-sub">Authorized Supply</span>
            </div>
            <div className="dist-logo-card">
              <span className="dist-logo-name">Motion Industries</span>
              <span className="dist-logo-sub">Power Transmission</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Verified Engineer Reviews (Amazon / Flipkart Customer Feedback style) */}
      <section className="reviews-section">
        <div className="container">
          <div className="section-header-block">
            <span className="section-pretitle">PLANT TESTIMONIALS</span>
            <h2 className="section-title">Trusted on Real Production Floors</h2>
          </div>

          <div className="reviews-grid">
            <div className="review-card">
              <div className="review-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="review-quote">
                "Our bottling line was down costing $40k/hr while OEM quoted 5 weeks for a proximity sensor. PartScout found the ifm IGT205 in 8 minutes with 14 units at McMaster. We had it running next morning."
              </p>
              <div className="reviewer-meta">
                <div className="reviewer-avatar">MV</div>
                <div className="reviewer-info">
                  <strong>Marcus Vance</strong>
                  <span>Lead Maintenance Engineer • Apex PackWorks</span>
                  <span className="verified-badge">
                    <CheckCircle2 size={12} /> Verified Plant User
                  </span>
                </div>
              </div>
            </div>

            <div className="review-card">
              <div className="review-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="review-quote">
                "The 3D CAD digital twin was a gamechanger. We were able to inspect the locknut thread pitch and rear M12 connector pinout directly in the browser before our procurement team issued the PO."
              </p>
              <div className="reviewer-meta">
                <div className="reviewer-avatar">EG</div>
                <div className="reviewer-info">
                  <strong>Elena Gomez</strong>
                  <span>Senior Procurement Specialist • Midwest Beverage Co.</span>
                  <span className="verified-badge">
                    <CheckCircle2 size={12} /> Verified Plant User
                  </span>
                </div>
              </div>
            </div>

            <div className="review-card">
              <div className="review-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="review-quote">
                "No hallucinated specifications. The fact that every comparison point quotes the exact page number of the PDF datasheet gave our reliability director total confidence to sign off on the substitute."
              </p>
              <div className="reviewer-meta">
                <div className="reviewer-avatar">DK</div>
                <div className="reviewer-info">
                  <strong>David Kim</strong>
                  <span>Reliability Director • Continental Packaging</span>
                  <span className="verified-badge">
                    <CheckCircle2 size={12} /> Verified Plant User
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Interactive FAQ Accordion */}
      <section className="faq-section">
        <div className="container">
          <div className="section-header-block">
            <span className="section-pretitle">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="section-title">Everything You Need to Know</h2>
          </div>

          <div className="faq-accordion">
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="faq-q-text">{faq.q}</span>
                  <ChevronDown size={18} className="faq-toggle-icon" />
                </button>
                {openFaq === i && (
                  <div className="faq-answer-panel">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Furnished E-Commerce Footer */}
      <footer className="ecommerce-footer">
        <div className="container">
          <div className="footer-top-grid">
            <div className="footer-brand-col">
              <div className="brand-container">
                <div className="brand-logo-mark">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="2" stroke="#D9531E" />
                    <circle cx="12" cy="12" r="5" strokeWidth="2" stroke="#117A65" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeWidth="2" stroke="#D9531E" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="brand-text">
                  <span className="brand-name">PartScout<span className="brand-ai">AI</span></span>
                  <span className="brand-sub">Industrial Replacement Intel</span>
                </div>
              </div>
              <p className="footer-brand-desc">
                Automated engineering replacement intelligence, deterministic specification audits, and supplier availability tracking for factory maintenance teams.
              </p>
              <div className="footer-trust-chips">
                <span className="trust-pill">DIN EN 60947-5-2</span>
                <span className="trust-pill">ISO 9001 Compliant Data</span>
                <span className="trust-pill">SOC2 Ready</span>
              </div>
            </div>

            <div className="footer-nav-col">
              <h5 className="footer-col-title">Popular Spares</h5>
              <ul className="footer-links-list">
                <li><a onClick={() => navigate('/app/results/req-line4-sensor')}>Inductive Proximity Sensors</a></li>
                <li><a onClick={() => navigate('/app/results/req-line4-sensor')}>Photoelectric Beams & Lasers</a></li>
                <li><a onClick={() => navigate('/app/results/req-line4-sensor')}>Pneumatic Directional Valves</a></li>
                <li><a onClick={() => navigate('/app/results/req-line4-sensor')}>PLC I/O Digital Cards</a></li>
                <li><a onClick={() => navigate('/app/results/req-line4-sensor')}>M12 4-Pin & 5-Pin Cables</a></li>
              </ul>
            </div>

            <div className="footer-nav-col">
              <h5 className="footer-col-title">Engineering Tools</h5>
              <ul className="footer-links-list">
                <li><a onClick={() => navigate('/app/requests/new/machine')}>Request Wizard</a></li>
                <li><a onClick={() => navigate('/app/compare/part-ifm-igt205')}>Specification Matrix</a></li>
                <li><a onClick={() => navigate('/app/quotes')}>Quotation Management</a></li>
                <li><a onClick={() => navigate('/app/suppliers')}>Supplier Directory</a></li>
                <li><a onClick={() => navigate('/admin/dashboard')}>Admin Operations</a></li>
              </ul>
            </div>

            <div className="footer-nav-col">
              <h5 className="footer-col-title">Plant Access</h5>
              <div className="footer-persona-buttons">
                <button
                  type="button"
                  className="btn btn-outline btn-sm btn-block"
                  onClick={() => navigate('/login')}
                >
                  Sign In with Demo Role
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-block"
                  onClick={() => navigate('/app/requests/new/machine')}
                >
                  Start New Part Search
                </button>
              </div>
              <span className="footer-plant-note">
                Simulated Sandbox • Apex PackWorks Plant B4
              </span>
            </div>
          </div>

          <div className="footer-bottom-strip">
            <span className="copyright-text">
              © 2026 PartScout AI Technologies Inc. All rights reserved. Industrial spare-part specifications are evaluated algorithmically for engineering review.
            </span>
            <div className="footer-bottom-links">
              <a href="#/">Data Integrity</a>
              <a href="#/">Terms of Service</a>
              <a href="#/">API Documentation</a>
              <a href="#/">Datasheet Sources</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
