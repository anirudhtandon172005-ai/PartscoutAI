from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from app.schemas import (
    SearchCreateRequest,
    SearchCreateResponse,
    SearchStatusResponse,
    CandidateResponse,
    CandidateListResponse,
    CandidateEvidence,
    RequirementSpec,
    SearchStatus,
    Compatibility,
)


class SearchRecord:
    def __init__(
        self,
        search_id: str,
        request: SearchCreateRequest,
        status: SearchStatus,
        candidates: list[CandidateResponse] | None = None,
        created_at: datetime | None = None,
        completed_at: datetime | None = None,
        error: str | None = None,
    ):
        self.search_id = search_id
        self.request = request
        self.status = status
        self.candidates = candidates or []
        self.created_at = created_at or datetime.now(timezone.utc)
        self.completed_at = completed_at
        self.error = error


class MockSearchProvider:
    """Deterministic mock provider that returns consistent candidates for the same request."""

    def discover_candidates(self, request: SearchCreateRequest) -> list[CandidateResponse]:
        return self._generate_candidates(request)

    def _generate_candidates(self, request: SearchCreateRequest) -> list[CandidateResponse]:
        query = f"{request.part_name} {request.original_part_number}".lower()

        # Category 1: Nails & Fasteners (e.g. searched "nail")
        if "nail" in query or "fastener" in query:
            return [
                CandidateResponse(
                    id="candidate-nail-001",
                    part_number="97990A110",
                    manufacturer="McMaster-Carr",
                    compatibility="compatible",
                    score=98,
                    specifications={
                        "category": "Industrial Fasteners / Common Nails",
                        "length": "3.0 in (10D Common)",
                        "material": "316 Stainless Steel (Corrosion Proof)",
                        "shank_type": "Smooth Shank with Diamond Point",
                        "shank_diameter": "0.148 in (9 Gauge)",
                        "head_diameter": "0.312 in",
                        "package_quantity": "250 pcs / box",
                        "tensile_strength": "130,000 psi",
                        "standards": "ASTM F1667 Specification",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="material",
                            quote="Type 316 Stainless Steel provides maximum resistance to salt spray, caustic washdowns, and harsh chemical exposure.",
                            source_url="https://www.mcmaster.com/97990A110",
                            confidence=0.99,
                        ),
                        CandidateEvidence(
                            field="shank_type",
                            quote="Smooth precision shank with diamond point tip ensures high holding power without timber splintering.",
                            source_url="https://www.mcmaster.com/97990A110",
                            confidence=0.98,
                        ),
                        CandidateEvidence(
                            field="standards",
                            quote="Manufactured to ASTM F1667 standard specifications for industrial driven nails.",
                            source_url="https://www.mcmaster.com/97990A110",
                            confidence=0.97,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-nail-002",
                    part_number="S10D-HDG",
                    manufacturer="Simpson Strong-Tie",
                    compatibility="compatible",
                    score=94,
                    specifications={
                        "category": "Structural Fasteners",
                        "length": "3.0 in (10D Common)",
                        "material": "Hot-Dip Galvanized Carbon Steel",
                        "shank_type": "Smooth Shank",
                        "shank_diameter": "0.148 in (9 Gauge)",
                        "head_diameter": "0.312 in",
                        "coating_class": "ASTM A153 Class D",
                        "package_quantity": "500 pcs / box",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="coating_class",
                            quote="ASTM A153 Class D heavy hot-dip zinc coating engineered for industrial preservative-treated timbers.",
                            source_url="https://www.grainger.com/search?searchQuery=Simpson+S10D",
                            confidence=0.96,
                        ),
                        CandidateEvidence(
                            field="shear_rating",
                            quote="Meets IBC structural framing code load capacities.",
                            source_url="https://www.grainger.com/search?searchQuery=Simpson+S10D",
                            confidence=0.95,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-nail-003",
                    part_number="10CDNG1",
                    manufacturer="Grip-Rite",
                    compatibility="partial",
                    score=90,
                    specifications={
                        "category": "High-Vibration Fasteners",
                        "length": "3.0 in (10D)",
                        "material": "Electro-Galvanized Carbon Steel",
                        "shank_type": "Annular Ring Shank (High Withdrawal)",
                        "shank_diameter": "0.148 in (9 Gauge)",
                        "pullout_resistance": "420 lbs withdrawal capacity",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="shank_type",
                            quote="Annular ring grooves bite into wood fibers to prevent backing out under heavy machine vibration.",
                            source_url="https://www.grainger.com/product/Grip-Rite-10D",
                            confidence=0.93,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-nail-004",
                    part_number="FAS-0144219",
                    manufacturer="Fastenal Industrial",
                    compatibility="compatible",
                    score=86,
                    specifications={
                        "category": "General Packaging Nails",
                        "length": "3.5 in (16D Heavy Common)",
                        "material": "Bright Carbon Steel (Indoor Use Only)",
                        "shank_type": "Smooth Shank",
                        "shank_diameter": "0.162 in (8 Gauge)",
                        "package_quantity": "1000 pcs / master carton",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="application",
                            quote="Recommended for heavy-duty wooden pallet, crate, and machinery crating fabrication.",
                            source_url="https://www.fastenal.com",
                            confidence=0.91,
                        ),
                    ],
                ),
            ]

        # Category 2: Bolts, Screws & Threaded Fasteners
        if any(w in query for w in ["bolt", "screw", "hex", "stud", "cap screw", "threaded"]):
            return [
                CandidateResponse(
                    id="candidate-bolt-001",
                    part_number="91280A540",
                    manufacturer="McMaster-Carr",
                    compatibility="compatible",
                    score=98,
                    specifications={
                        "category": "High-Strength Fasteners / Hex Head Cap Screws",
                        "thread_size": "M10 x 1.5 Metric Coarse",
                        "length": "45 mm Under Head",
                        "material": "Grade 8 / Class 10.9 High-Tensile Alloy Steel",
                        "finish": "Zinc-Yellow Trivalent Chromate Plated",
                        "drive_style": "16 mm External Hex A/F",
                        "tensile_strength": "150,000 psi (1040 MPa)",
                        "standards": "DIN 931 / ISO 4014 Specification",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="tensile_strength",
                            quote="Class 10.9 heat-treated alloy steel delivers high shear and clamping force for dynamic machine joints.",
                            source_url="https://www.mcmaster.com/91280A540",
                            confidence=0.99,
                        ),
                        CandidateEvidence(
                            field="standards",
                            quote="Conforms to ISO 4014 partially threaded standard industrial machine dimensions.",
                            source_url="https://www.mcmaster.com/91280A540",
                            confidence=0.98,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-bolt-002",
                    part_number="FAS-M10X45-A2",
                    manufacturer="Fastenal Industrial",
                    compatibility="compatible",
                    score=94,
                    specifications={
                        "category": "Corrosion-Resistant Stainless Fasteners",
                        "thread_size": "M10 x 1.5",
                        "length": "45 mm",
                        "material": "A2-70 (304) Stainless Steel",
                        "drive_style": "16 mm Hex",
                        "proof_strength": "700 MPa",
                        "operating_environment": "Washdown & Food Processing Grade",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="material",
                            quote="A2-70 Austenitic Stainless Steel eliminates galvanic rust in damp washdown conveyors.",
                            source_url="https://www.fastenal.com/product/details/M10-45-A2",
                            confidence=0.97,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-bolt-003",
                    part_number="1N894",
                    manufacturer="Grainger Industrial",
                    compatibility="compatible",
                    score=91,
                    specifications={
                        "category": "Heavy Hex Bolts",
                        "thread_size": "M10 x 1.5",
                        "length": "45 mm",
                        "material": "Class 8.8 Medium Carbon Steel",
                        "finish": "Clear Zinc Plated",
                        "package_quantity": "50 pcs / box",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="compatibility",
                            quote="Drop-in standard metric hex bolt replacement certified for general industrial machinery.",
                            source_url="https://www.grainger.com/product/1N894",
                            confidence=0.95,
                        ),
                    ],
                ),
            ]

        # Category 3: Industrial Bearings & Power Transmission
        if any(w in query for w in ["bearing", "ball bearing", "roller bearing", "skf", "timken", "fag", "nsk", "pillow block"]):
            return [
                CandidateResponse(
                    id="candidate-bearing-001",
                    part_number="6205-2RSH",
                    manufacturer="SKF",
                    compatibility="compatible",
                    score=99,
                    specifications={
                        "category": "Deep Groove Ball Bearings / Sealed",
                        "bore_diameter": "25 mm (ID)",
                        "outer_diameter": "52 mm (OD)",
                        "width": "15 mm",
                        "seals": "Dual Contact Rubber Seals (2RSH / NBR)",
                        "basic_dynamic_load": "14.8 kN (Cr)",
                        "limiting_speed": "8,500 RPM",
                        "internal_clearance": "CN Normal Radial Clearance",
                        "standards": "ISO 492 / DIN 625 Precision Tolerances",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="bore_diameter",
                            quote="Bore diameter 25 mm precision ground to ISO class normal fits for rotating shafts.",
                            source_url="https://www.skf.com/group/products/rolling-bearings/ball-bearings/6205-2RSH",
                            confidence=0.99,
                        ),
                        CandidateEvidence(
                            field="seals",
                            quote="RSH sheet steel reinforced acrylonitrile-butadiene rubber seals keep grease in and fine dust out.",
                            source_url="https://www.skf.com/group/products/rolling-bearings/ball-bearings/6205-2RSH",
                            confidence=0.98,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-bearing-002",
                    part_number="6205-2RS-TIMKEN",
                    manufacturer="Timken",
                    compatibility="compatible",
                    score=95,
                    specifications={
                        "category": "Heavy Duty Deep Groove Bearings",
                        "bore_diameter": "25 mm",
                        "outer_diameter": "52 mm",
                        "width": "15 mm",
                        "seals": "Molded Rubber Contact Seals (2RS)",
                        "basic_dynamic_load": "14.0 kN",
                        "grease_fill": "Chevron SRI-2 High Temperature Grease",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="dynamic_load",
                            quote="Engineered with vacuum-degassed 52100 high carbon chrome steel for extended L10 fatigue life.",
                            source_url="https://www.timken.com/products/bearings/deep-groove/6205-2rs",
                            confidence=0.97,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-bearing-003",
                    part_number="6205DDU-NSK",
                    manufacturer="NSK",
                    compatibility="compatible",
                    score=92,
                    specifications={
                        "category": "Electric Motor Quality Ball Bearings",
                        "bore_diameter": "25 mm",
                        "outer_diameter": "52 mm",
                        "width": "15 mm",
                        "seals": "Double Contact DDU Rubber Seals",
                        "vibration_level": "Quiet Running V2 Grade",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="vibration_level",
                            quote="Low noise EMQ bearing designed for continuous high-speed conveyor and motor drives.",
                            source_url="https://www.nsk.com/products/bearings/6205ddu",
                            confidence=0.96,
                        ),
                    ],
                ),
            ]

        # Category 4: Electric Motors, Drives & VFD Inverters
        if any(w in query for w in ["motor", "vfd", "inverter", "drive", "servo", "siemens", "weg", "baldor"]):
            return [
                CandidateResponse(
                    id="candidate-motor-001",
                    part_number="1LE1001-1DB4",
                    manufacturer="Siemens",
                    compatibility="compatible",
                    score=98,
                    specifications={
                        "category": "Low Voltage 3-Phase AC Induction Motors",
                        "rated_power": "2.2 kW (3.0 HP)",
                        "rated_speed": "1750 RPM (4-Pole)",
                        "rated_voltage": "230V / 400V AC 50/60 Hz",
                        "frame_size": "IEC 90L Cast Aluminum (IP55)",
                        "shaft_diameter": "24 mm with Keyway",
                        "efficiency_class": "IE3 Premium Efficiency",
                        "mounting_type": "B3 Foot Mounted / B14 Face Flange",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="rated_power",
                            quote="Continuous heavy-duty 2.2 kW output compliant with IEC 60034-30 standard.",
                            source_url="https://mall.industry.siemens.com/mall/en/WW/Catalog/Product/1LE1001-1DB4",
                            confidence=0.99,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-motor-002",
                    part_number="W22-00318ET3E90L",
                    manufacturer="WEG",
                    compatibility="compatible",
                    score=94,
                    specifications={
                        "category": "Industrial Cast Iron AC Motors",
                        "rated_power": "2.2 kW (3.0 HP)",
                        "rated_speed": "1755 RPM",
                        "frame_size": "NEMA 90L Cast Iron Housing",
                        "shaft_diameter": "24 mm",
                        "efficiency_class": "NEMA Premium / IE3",
                        "ingress_protection": "IP55 Standard Washdown",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="frame_size",
                            quote="Cast iron FC-200 housing provides superior thermal dissipation and vibration dampening.",
                            source_url="https://www.weg.net/institutional/US/en/products/electric-motors/w22",
                            confidence=0.97,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-motor-003",
                    part_number="ATV320U22N4B",
                    manufacturer="Schneider Electric",
                    compatibility="partial",
                    score=89,
                    specifications={
                        "category": "Variable Speed Inverter Drives (VFD)",
                        "motor_power_rating": "2.2 kW (3 HP)",
                        "supply_voltage": "380 ... 500 V AC 3-Phase",
                        "output_frequency": "0.1 ... 599 Hz",
                        "communication_protocol": "Modbus RTU / CANopen",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="motor_power_rating",
                            quote="Compact variable speed drive optimized for 2.2 kW pumps, conveyors, and mechanical packagers.",
                            source_url="https://www.se.com/ww/en/product/ATV320U22N4B",
                            confidence=0.95,
                        ),
                    ],
                ),
            ]

        # Category 5: Pneumatics, Valves & Actuators
        if any(w in query for w in ["valve", "solenoid", "pneumatic", "cylinder", "festo", "smc", "parker"]):
            return [
                CandidateResponse(
                    id="candidate-valve-001",
                    part_number="VUVS-L25-M52-MD-G14",
                    manufacturer="Festo",
                    compatibility="compatible",
                    score=97,
                    specifications={
                        "category": "Pneumatic Directional Control Valves",
                        "valve_function": "5/2-Way Bistable Spool Valve",
                        "pneumatic_ports": "G 1/4 Female Thread",
                        "solenoid_voltage": "24 V DC (3.1 W)",
                        "operating_pressure": "2.0 ... 10.0 bar (30-145 psi)",
                        "nominal_flow_rate": "1,200 L/min (Qn)",
                        "housing_material": "Anodized Die-Cast Aluminum",
                        "electrical_connection": "DIN EN 175301-803 Form C Plug",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="valve_function",
                            quote="5/2 way monostable pneumatic spool valve with internal pilot air and mechanical reset spring.",
                            source_url="https://www.festo.com/catalogue/vuvs",
                            confidence=0.99,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-valve-002",
                    part_number="SY5120-5LZ-01",
                    manufacturer="SMC",
                    compatibility="compatible",
                    score=93,
                    specifications={
                        "category": "Compact Solenoid Valves",
                        "valve_function": "5/2 Single Solenoid",
                        "pneumatic_ports": "Rc 1/8 / G 1/4 Subplate Mount",
                        "solenoid_voltage": "24 V DC Low Power (0.35 W)",
                        "operating_pressure": "1.5 ... 7.0 bar",
                        "flow_rate": "1,050 L/min",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="solenoid_voltage",
                            quote="Ultra low power 0.35W coil allows direct driving from PLC digital output cards without interposing relays.",
                            source_url="https://www.smcworld.com/products/en/directional/sy5000",
                            confidence=0.96,
                        ),
                    ],
                ),
            ]

        # Category 6: Industrial Cables, M12 & Connectivity
        if any(w in query for w in ["cable", "cord", "wire", "connector", "m12", "patch", "phoenix contact"]):
            return [
                CandidateResponse(
                    id="candidate-cable-001",
                    part_number="SAC-4P-5,0-PUR/M12FS",
                    manufacturer="Phoenix Contact",
                    compatibility="compatible",
                    score=98,
                    specifications={
                        "category": "Sensor/Actuator Cables & Connectors",
                        "connector_type": "M12 A-Coded Female Straight Socket",
                        "number_of_positions": "4-Pin Gold-Plated Contacts",
                        "cable_length": "5.0 meters (16.4 ft)",
                        "sheath_material": "Halogen-Free Oil-Resistant PUR (Black)",
                        "conductor_cross_section": "4 x 0.34 mm² (AWG 22)",
                        "ingress_protection": "IP67 / IP68 / IP69K",
                        "bending_cycles": "10,000,000 Drag Chain Rated",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="sheath_material",
                            quote="Polyurethane PUR outer jacket resists coolants, synthetic lubricants, and welding sparks.",
                            source_url="https://www.phoenixcontact.com/product/1668124",
                            confidence=0.99,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-cable-002",
                    part_number="7000-12221-0340500",
                    manufacturer="Murrelektronik",
                    compatibility="compatible",
                    score=94,
                    specifications={
                        "category": "Industrial Sensor Patch Cords",
                        "connector_type": "M12 Female Straight to Flying Leads",
                        "number_of_positions": "4-Pin",
                        "cable_length": "5.0 meters",
                        "cable_jacket": "PUR Flexible Gray Cable",
                        "protection": "IP67 Coupling",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="connector_type",
                            quote="M12 screw locking knurled nut made of nickel-plated die-cast zinc with vibration-proof ratcheting.",
                            source_url="https://www.murrelektronik.com/product/7000-12221-0340500",
                            confidence=0.97,
                        ),
                    ],
                ),
            ]

        # Category 7: Inductive Sensors & Automation Presence
        if any(w in query for w in ["sensor", "proximity", "bes", "igt", "inductive", "balluff", "photoelectric"]):
            return [
                CandidateResponse(
                    id="candidate-001",
                    part_number="IGT205",
                    manufacturer="ifm efector",
                    compatibility="compatible",
                    score=96,
                    specifications={
                        "mounting": "flush",
                        "output": "PNP normally open",
                        "sensing_range_mm": 8.0,
                        "connector": "M12 4-pin",
                        "housing_material": "316L Stainless Steel",
                        "ingress_protection": "IP68 / IP69K",
                        "operating_voltage": "10-36 V DC",
                        "switching_frequency": "400 Hz",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="sensing_range_mm",
                            quote="Sensing range: 8 mm flush mountable",
                            source_url="https://www.ifm.com/product/IGT205",
                            confidence=0.98,
                        ),
                        CandidateEvidence(
                            field="mounting",
                            quote="Flush mountable M18 x 1 threaded body",
                            source_url="https://www.ifm.com/product/IGT205",
                            confidence=0.98,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-002",
                    part_number="Bi8U-M18-AP6X-H1141",
                    manufacturer="Turck",
                    compatibility="compatible",
                    score=92,
                    specifications={
                        "mounting": "flush",
                        "output": "PNP normally open",
                        "sensing_range_mm": 8.0,
                        "connector": "M12 4-pin",
                        "housing_material": "Chrome-Plated Brass",
                        "ingress_protection": "IP68",
                        "operating_voltage": "10-30 V DC",
                        "switching_frequency": "1500 Hz",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="sensing_range_mm",
                            quote="Rated switching distance: 8 mm",
                            source_url="https://turck.us/product/Bi8U-M18-AP6X-H1141",
                            confidence=0.96,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-003",
                    part_number="NBB8-18GM50-E2-V1",
                    manufacturer="Pepperl+Fuchs",
                    compatibility="partial",
                    score=88,
                    specifications={
                        "mounting": "flush",
                        "output": "PNP normally open",
                        "sensing_range_mm": 8.0,
                        "connector": "M12 4-pin",
                        "housing_material": "Nickel-Plated Brass",
                        "ingress_protection": "IP67",
                        "operating_voltage": "10-30 V DC",
                        "switching_frequency": "500 Hz",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="sensing_range_mm",
                            quote="Rated operating distance: 8 mm",
                            source_url="https://pepperl-fuchs.com/en/spec/084321.htm",
                            confidence=0.94,
                        ),
                    ],
                ),
            ]

        # Category 8: General industrial parts fallback tailored to request
        clean_name = request.part_name.title()
        return [
            CandidateResponse(
                id="candidate-gen-001",
                part_number=f"MC-{request.original_part_number[:6]}-HD",
                manufacturer="McMaster-Carr",
                compatibility="compatible",
                score=97,
                specifications={
                    "item_description": f"{clean_name} - Heavy Duty Commercial Grade",
                    "material": "316 Stainless Steel / High-Tensile Alloy",
                    "packaging": "Immediate Dispatch / In Stock",
                    "tolerance": "ISO / ANSI Standard Fit",
                    "operating_environment": "Industrial Plant Rated",
                },
                evidence=[
                    CandidateEvidence(
                        field="specification",
                        quote=f"Precision engineered {clean_name} certified for continuous industrial plant operation.",
                        source_url=f"https://www.mcmaster.com/search?q={request.original_part_number}",
                        confidence=0.98,
                    ),
                ],
            ),
            CandidateResponse(
                id="candidate-gen-002",
                part_number=f"GR-{request.original_part_number[:6]}-IND",
                manufacturer="Grainger Industrial",
                compatibility="compatible",
                score=93,
                specifications={
                    "item_description": f"{clean_name} - Direct Supplier Equivalent",
                    "material": "Industrial Grade Carbon / Alloy",
                    "warranty": "1-Year Manufacturer Warranty",
                    "standards": "OSHA / ANSI Compliant",
                },
                evidence=[
                    CandidateEvidence(
                        field="compatibility",
                        quote=f"Drop-in replacement for OEM {clean_name} {request.original_part_number}.",
                        source_url=f"https://www.grainger.com/search?searchQuery={request.original_part_number}",
                        confidence=0.95,
                    ),
                ],
            ),
            CandidateResponse(
                id="candidate-gen-003",
                part_number=f"RAD-{request.original_part_number[:6]}-OEM",
                manufacturer="Radwell International",
                compatibility="partial",
                score=89,
                specifications={
                    "item_description": f"{clean_name} - Factory Sealed Surplus",
                    "condition": "New Surplus / OEM Certified",
                    "availability": "In Stock (Immediate Dispatch)",
                },
                evidence=[
                    CandidateEvidence(
                        field="condition",
                        quote="Tested and certified factory surplus with 2-year Radwell warranty.",
                        source_url=f"https://www.radwell.com/en-US/Buy/{request.original_part_number}",
                        confidence=0.92,
                    ),
                ],
            ),
        ]


# In-memory stores
_searches: dict[str, SearchRecord] = {}
_candidates: dict[str, list[CandidateResponse]] = {}
_provider = MockSearchProvider()


class SearchService:
    def create_search(self, request: SearchCreateRequest) -> SearchCreateResponse:
        search_id = f"search-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)

        # Generate candidates synchronously
        candidates = _provider.discover_candidates(request)

        # Store search record
        record = SearchRecord(
            search_id=search_id,
            request=request,
            status="completed",
            candidates=candidates,
            created_at=now,
            completed_at=now,
        )
        _searches[search_id] = record
        _candidates[search_id] = candidates

        return SearchCreateResponse(
            id=search_id,
            status="completed",
            created_at=now,
            completed_at=now,
            candidate_count=len(candidates),
        )

    def _ensure_search(self, search_id: str) -> SearchRecord:
        if search_id not in _searches:
            s_lower = search_id.lower()
            if "nail" in s_lower:
                part_name = "Common Steel Wire Framing Nail (10D)"
                part_no = "97990A110"
                mfg = "McMaster-Carr"
                mach = "Automated Packaging & Crating Unit (Line 2)"
                qty = 250
            elif "bolt" in s_lower or "screw" in s_lower or "hex" in s_lower:
                part_name = "Hex Head Cap Screw Grade 8 (M10 x 1.5 x 45mm)"
                part_no = "91280A540"
                mfg = "McMaster-Carr"
                mach = "High-Torque Drive Assembly Line 3"
                qty = 50
            elif "bearing" in s_lower:
                part_name = "Deep Groove Ball Bearing (6205-2RS Sealed)"
                part_no = "6205-2RSH"
                mfg = "SKF"
                mach = "Conveyor Main Drive Spindle Line 1"
                qty = 4
            elif "motor" in s_lower or "drive" in s_lower or "vfd" in s_lower or "inverter" in s_lower:
                part_name = "3-Phase AC Induction Motor (2.2kW / 3HP 1750 RPM)"
                part_no = "1LE1001-1DB4"
                mfg = "Siemens"
                mach = "High-Speed Bottling Depalletizer Line 4"
                qty = 1
            elif "valve" in s_lower or "pneumatic" in s_lower or "solenoid" in s_lower:
                part_name = "5/2-Way Directional Solenoid Valve (G 1/4\" 24V DC)"
                part_no = "VUVS-L25-M52-MD-G14"
                mfg = "Festo"
                mach = "Pneumatic Diverter System Line 2"
                qty = 2
            elif "cable" in s_lower or "connector" in s_lower or "m12" in s_lower:
                part_name = "M12 4-Pin Shielded Sensor Cable (5m PUR)"
                part_no = "SAC-4P-5,0-PUR/M12FS"
                mfg = "Phoenix Contact"
                mach = "Sensor Network Trunk Line 4"
                qty = 10
            elif any(w in s_lower for w in ["sensor", "proximity", "bes", "igt", "inductive", "balluff"]):
                part_name = "M18 Shielded Inductive Proximity Sensor"
                part_no = "BES 516-325-G-E5-C-S4"
                mfg = "Balluff GmbH"
                mach = "Packaging Machine RF-480 Line 4"
                qty = 2
            else:
                clean_term = s_lower.replace("req-", "").replace("search-", "").split("-")[0].title() or "Industrial Replacement Component"
                part_name = f"{clean_term} Industrial Assembly"
                part_no = f"PART-{clean_term[:4].upper()}-2026"
                mfg = "Industrial Catalog Supplier"
                mach = "General Facility Asset Line"
                qty = 1

            default_req = SearchCreateRequest(
                machine_name=mach,
                part_name=part_name,
                original_part_number=part_no,
                manufacturer=mfg,
                quantity=qty,
                requirements=RequirementSpec(),
            )
            now = datetime.now(timezone.utc)
            candidates = _provider.discover_candidates(default_req)
            record = SearchRecord(
                search_id=search_id,
                request=default_req,
                status="completed",
                candidates=candidates,
                created_at=now,
                completed_at=now,
            )
            _searches[search_id] = record
            _candidates[search_id] = candidates
        return _searches[search_id]

    def get_search(self, search_id: str) -> SearchStatusResponse:
        record = self._ensure_search(search_id)
        return SearchStatusResponse(
            id=record.search_id,
            status=record.status,
            request=record.request,
            candidate_count=len(record.candidates),
            created_at=record.created_at,
            completed_at=record.completed_at,
            error=record.error,
        )

    def get_candidates(self, search_id: str) -> CandidateListResponse:
        self._ensure_search(search_id)
        items = _candidates.get(search_id, [])
        return CandidateListResponse(search_id=search_id, items=items)


search_service = SearchService()