-- ============================================
-- SEED DATA FOR PARTSCOUT
-- Run in Supabase Dashboard -> SQL Editor -> New Query
-- ============================================

-- 1. Workspace
INSERT INTO public.workspaces (id, name, facility, owner_id)
VALUES ('00000000-0000-0000-0000-000000000002', 'Apex PackWorks - Main Plant', 'Apex PackWorks - Main Plant (Facility B4)', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 2. Workspace Member
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'owner')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 3. Profile
INSERT INTO public.profiles (id, email, full_name, facility, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@partscout.test', 'Marcus Vance', 'Apex PackWorks - Main Plant (Facility B4)', 'engineer')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- 4. Machines
INSERT INTO public.machines (id, workspace_id, manufacturer, model, machine_type, facility, production_line, commission_year, criticality, notes) VALUES
('mach-rf480-line4', '00000000-0000-0000-0000-000000000002', 'Krones AG', 'Rotary Filler RF-480 HighSpeed', 'Beverage Bottling & Capping Carousel', 'Apex PackWorks - Main Plant (Building B)', 'High-Velocity Bottling Line 4', 2018, 'High', 'Downstream capper proximity station. Subject to high-pressure washdown (CIP 65°C caustic solutions).'),
('mach-kuka-cell2', '00000000-0000-0000-0000-000000000002', 'KUKA Robotics', 'KR 16 R2010 Cybertech', '6-Axis Articulated Robot Arm', 'Apex PackWorks - Assembly Wing', 'Robotic Case Packing Cell 2', 2021, 'Medium', 'End-of-arm tooling vacuum gripper manifold.'),
('mach-hydra-ext1', '00000000-0000-0000-0000-000000000002', 'Battenfeld-Cincinnati', 'solEX 75-40 Extruder', 'Single-Screw High Output Extrusion', 'Apex PackWorks - Polymer Processing', 'Profile Extrusion Line 1', 2016, 'High', 'Barrel temperature zone 3 thermocouple & melt pressure safety interlock.')
ON CONFLICT (id) DO NOTHING;

-- 5. Parts
INSERT INTO public.parts (id, workspace_id, part_number, manufacturer, name, category, description, datasheet_url, specifications) VALUES
('part-balluff-bes516', '00000000-0000-0000-0000-000000000002', 'BES 516-325-G-E5-C-S4', 'Balluff GmbH', 'M18 Shielded Inductive Proximity Sensor', 'Inductive Sensors / Automation Presence Detection', 'M18x1 cylindrical flush-mount proximity switch with PNP Normally Open switching output, 8mm operating distance, and 4-pin M12 standard connector.', 'https://example.com/datasheets/balluff-bes516.pdf', '{"sensing_distance_mm": 8.0, "installation_type": "flush", "thread_size": "M18 x 1.0", "housing_length_mm": 65, "threaded_length_mm": 45, "output": "PNP NO", "operating_voltage": "10-30 V DC", "switching_frequency_hz": 500, "housing_material": "Nickel-Plated Brass", "sensing_face_material": "PBT", "ip_rating": "IP67/IP68", "connector": "M12 4-pin", "temperature_range": "-25 to +70 C"}'),
('part-ifm-igt205', '00000000-0000-0000-0000-000000000002', 'IGT205', 'ifm efector', 'M18 Flush Inductive Sensor (Full Stainless)', 'Inductive Proximity / Food & Wet Area Industrial', 'High-grade stainless steel M18 inductive proximity sensor with gold-plated 4-pin M12 connector. Designed for harsh washdown and mechanical shock resistance.', 'https://example.com/datasheets/ifm-igt205.pdf', '{"sensing_distance_mm": 8.0, "installation_type": "flush", "thread_size": "M18 x 1.0", "housing_length_mm": 70, "threaded_length_mm": 48, "output": "PNP NO", "operating_voltage": "10-36 V DC", "switching_frequency_hz": 400, "housing_material": "316L Stainless Steel", "sensing_face_material": "PEEK", "ip_rating": "IP68/IP69K", "connector": "M12 4-pin gold-plated", "temperature_range": "-40 to +85 C"}')
ON CONFLICT (id) DO NOTHING;

-- 6. Part Request
INSERT INTO public.part_requests (id, workspace_id, machine_id, request_number, machine_name, part_name, original_part_number, manufacturer, quantity_needed, urgency, acceptable_alternatives, custom_requirements, status, target_component_id, created_by) VALUES
('req-2026-line4-sensor', '00000000-0000-0000-0000-000000000002', 'mach-rf480-line4', 'REQ-2026-0891', 'Krones Rotary Filler RF-480 (Line 4)', 'M18 Shielded Inductive Proximity Sensor', 'BES 516-325-G-E5-C-S4', 'Balluff GmbH', 2, 'Line Down (Critical)', true, 'Must be flush mount M18 with 8mm sensing range and PNP NO output. Stainless housing preferred due to daily washdown.', 'Candidates Found', 'part-balluff-bes516', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 7. Request Note
INSERT INTO public.request_notes (workspace_id, request_id, author_id, author_name, text) VALUES
('00000000-0000-0000-0000-000000000002', 'req-2026-line4-sensor', '00000000-0000-0000-0000-000000000001', 'Marcus Vance (Lead Maintenance Tech)', 'Sensor failed during morning sanitization cycle on Capper Station 3. Line running at reduced 60% capacity.')
ON CONFLICT DO NOTHING;

-- 8. Suppliers (global)
INSERT INTO public.suppliers (id, workspace_id, name, domain, type, country, headquarters, inventory_reliability_score, average_fulfillment_days, active_listings_count, verified_partner, contact_disclaimer, direct_phone, support_email, website_url, description) VALUES
('supp-mcmaster', NULL, 'McMaster-Carr Supply Company', 'mcmaster.com', 'Authorized Distributor', 'United States', 'Elmhurst, Illinois', 99.4, 1, 580000, true, 'Illustrative directory entry. Contact information represents publicly known supplier headquarters; PartScout does not verify live representative availability.', '+1 (630) 833-0300 (Public Directory)', 'orders@mcmaster.com (Public Directory)', 'https://www.mcmaster.com', 'Premier North American supplier of industrial maintenance, repair, and operations (MRO) hardware with same-day order processing and extensive CAD library integration.'),
('supp-radwell', NULL, 'Radwell International LLC', 'radwell.com', 'Specialist Stockist', 'United States & Europe', 'Willingboro, New Jersey', 94.8, 2, 2200000, true, 'Illustrative directory entry. Surplus and factory sealed inventory states change frequently. Contact sales directly to reserve specific lot serials.', '+1 (800) 884-5500 (Public Directory)', 'sales@radwell.com (Public Directory)', 'https://www.radwell.com', 'Global specialist in surplus, refurbished, and obsolete factory automation parts, PLCs, drives, sensors, and servo motors with in-house testing labs.')
ON CONFLICT (id) DO NOTHING;

-- 9. Supplier Offers
INSERT INTO public.supplier_offers (id, workspace_id, supplier_id, part_id, part_number, supplier_name, supplier_domain, supplier_type, location, reported_price, currency, stock_status, quantity_available, lead_time_days, min_order_quantity, source_url, last_checked, freshness, notes) VALUES
('off-ifm-mcmaster', '00000000-0000-0000-0000-000000000002', 'supp-mcmaster', 'part-ifm-igt205', 'IGT205', 'McMaster-Carr', 'mcmaster.com', 'Authorized Distributor', 'Elmhurst, IL, USA', 108.40, 'USD', 'In Stock', 14, 1, 1, 'https://mcmaster.com/search?q=IGT205', NOW(), 'fresh', 'Guaranteed same-day courier dispatch for orders placed before 4:00 PM CST.')
ON CONFLICT (id) DO NOTHING;

-- 10. Quotation
INSERT INTO public.quotations (id, workspace_id, part_request_id, supplier_id, part_number, supplier_name, unit_price, currency, quantity, total_price, lead_time_weeks, rfq_number, quoted_at, valid_until, terms, is_official, status, created_by) VALUES
('quote-rfq-101', '00000000-0000-0000-0000-000000000002', 'req-2026-line4-sensor', 'supp-mcmaster', 'IGT205 (ifm efector)', 'McMaster-Carr', 108.40, 'USD', 2, 216.80, 0, 'RFQ-2026-4018', NOW(), NOW() + INTERVAL '30 days', 'Net 30. Ground or Next-Day Air freight available.', true, 'Pending Review', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 11. Source Domains
INSERT INTO public.source_domains (id, workspace_id, name, domain, category, enabled, crawl_frequency, last_crawl_status, last_crawl_time, extracted_products_count, notes) VALUES
('dom-1', '00000000-0000-0000-0000-000000000002', 'Balluff Global Portal', 'balluff.com', 'Manufacturer Portal', true, 'Daily', 'Success', NOW(), 14200, 'Official XML catalog sitemap endpoint indexed.'),
('dom-2', '00000000-0000-0000-0000-000000000002', 'ifm Electronic Catalog', 'ifm.com', 'Manufacturer Portal', true, 'Daily', 'Success', NOW(), 22800, 'Complete multilingual spec tables extracted.')
ON CONFLICT (id) DO NOTHING;

-- 12. Collection Jobs
INSERT INTO public.collection_jobs (id, workspace_id, job_name, domain, status, records_extracted, duration_seconds, retries, started_at, completed_at) VALUES
('job-1089', '00000000-0000-0000-0000-000000000002', 'Hourly Distributor Stock Delta Sync', 'digikey.com', 'Completed', 842, 14.8, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 13. Data Quality Issues
INSERT INTO public.data_quality_issues (id, workspace_id, issue_type, severity, part_number, description, sources, detected_at, resolved) VALUES
('dq-1', '00000000-0000-0000-0000-000000000002', 'Stale Stock Observation', 'Medium', 'IME18-08BPSZC0S', 'Supplier offer from Radwell has not refreshed in 32 hours. Stock claim of 12 units flagged for manual verification.', '["radwell.com"]', NOW(), false)
ON CONFLICT (id) DO NOTHING;

-- 14. Saved Part
INSERT INTO public.saved_parts (workspace_id, user_id, part_id) VALUES
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'part-ifm-igt205')
ON CONFLICT (workspace_id, user_id, part_id) DO NOTHING;

