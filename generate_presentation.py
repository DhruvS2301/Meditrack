import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette
    C_FOREST = RGBColor(49, 92, 72)      # #315C48 primary accent
    C_DARK = RGBColor(32, 39, 34)        # #202722 text dark
    C_MUTED = RGBColor(116, 124, 117)    # #747C75 text secondary
    C_SAGE = RGBColor(220, 233, 223)     # #DCE9DF accent light
    C_BG = RGBColor(247, 248, 245)       # #F7F8F5 background
    C_WHITE = RGBColor(255, 255, 255)
    C_BORDER = RGBColor(226, 230, 223)   # #E2E6DF border
    C_CRIMSON = RGBColor(183, 75, 67)    # #B74B43 critical
    C_PINE = RGBColor(54, 118, 83)       # #367653 positive
    C_CODE_BG = RGBColor(238, 241, 237)

    def set_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_BG
        bg.line.fill.background()
        return bg

    def add_header(slide, title, category="MEDITRACK — HOSPITAL DBMS PLATFORM"):
        set_bg(slide)
        
        # Category tag
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.35))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        tf_cat.margin_left = tf_cat.margin_top = tf_cat.margin_right = tf_cat.margin_bottom = 0
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = C_FOREST
        p_cat.font.name = "Arial"

        # Main Slide Title
        t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.6))
        tf_t = t_box.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0
        p_t = tf_t.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(22)
        p_t.font.bold = True
        p_t.font.color.rgb = C_DARK
        p_t.font.name = "Arial"

        # Accent Line under header
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.42), Inches(11.733), Inches(0.02))
        line.fill.solid()
        line.fill.fore_color.rgb = C_BORDER
        line.line.fill.background()

    def add_card(slide, left, top, width, height, bg_color=C_WHITE, border_color=C_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1)
        return card

    # =========================================================================
    # SLIDE 1: Title Slide (Dark Hero Style)
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)
    bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = C_FOREST
    bg1.line.fill.background()

    # Title & Subtitle in White
    tbox = slide1.shapes.add_textbox(Inches(1.0), Inches(1.2), Inches(11.3), Inches(2.2))
    tf = tbox.text_frame
    tf.word_wrap = True
    
    p0 = tf.paragraphs[0]
    p0.text = "CSE DBMS LABORATORY CAPSTONE PROJECT"
    p0.font.size = Pt(12)
    p0.font.bold = True
    p0.font.color.rgb = C_SAGE
    p0.font.name = "Arial"
    p0.space_after = Pt(14)

    p1 = tf.add_paragraph()
    p1.text = "MediTrack"
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = C_WHITE
    p1.font.name = "Arial"
    p1.space_after = Pt(8)

    p2 = tf.add_paragraph()
    p2.text = "Enterprise Hospital Management, Patient Tracking & Relational DBMS Architecture"
    p2.font.size = Pt(18)
    p2.font.color.rgb = C_SAGE
    p2.font.name = "Arial"

    # Stat cards grid (4 cards across)
    stats = [
        ("10 Core Tables", "Normalized to 3NF / BCNF with strict relational foreign keys"),
        ("100% Parameterised", "Direct pg SQL engine with zero SQL injection vulnerability"),
        ("GiST Exclusion", "Database-level double booking & bed conflict prevention"),
        ("Audit Trails", "Automated JSONB state capture on all database mutations")
    ]
    card_w = Inches(2.68)
    card_h = Inches(2.2)
    start_x = Inches(1.0)
    start_y = Inches(4.3)
    gap = Inches(0.2)

    for i, (stitle, sdesc) in enumerate(stats):
        cx = start_x + i * (card_w + gap)
        scard = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, start_y, card_w, card_h)
        scard.fill.solid()
        scard.fill.fore_color.rgb = RGBColor(38, 73, 57)  # darker forest
        scard.line.color.rgb = RGBColor(65, 115, 91)
        scard.line.width = Pt(1)

        cbox = slide1.shapes.add_textbox(cx + Inches(0.2), start_y + Inches(0.25), card_w - Inches(0.4), card_h - Inches(0.5))
        ctf = cbox.text_frame
        ctf.word_wrap = True
        
        cp0 = ctf.paragraphs[0]
        cp0.text = stitle
        cp0.font.size = Pt(16)
        cp0.font.bold = True
        cp0.font.color.rgb = C_WHITE
        cp0.font.name = "Arial"
        cp0.space_after = Pt(8)

        cp1 = ctf.add_paragraph()
        cp1.text = sdesc
        cp1.font.size = Pt(11)
        cp1.font.color.rgb = C_SAGE
        cp1.font.name = "Arial"

    # =========================================================================
    # SLIDE 2: Problem Statement & Engineering Objectives
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_layout)
    add_header(slide2, "Problem Statement & Relational Engineering Response")

    # Column 1: The Problem
    add_card(slide2, Inches(0.8), Inches(1.7), Inches(5.7), Inches(5.2))
    pbox1 = slide2.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(5.1), Inches(4.8))
    ptf1 = pbox1.text_frame
    ptf1.word_wrap = True

    h1 = ptf1.paragraphs[0]
    h1.text = "THE HEALTHCARE DATA CRISIS"
    h1.font.size = Pt(14)
    h1.font.bold = True
    h1.font.color.rgb = C_CRIMSON
    h1.space_after = Pt(14)

    probs = [
        ("Fragmented Patient Records", "Patient demographics, medical encounters, and billing reside in isolated paper charts with zero consistency."),
        ("Catastrophic Double-Booking", "Physicians and ICU beds are frequently scheduled concurrently due to absence of relational conflict checks."),
        ("Academic Prototype Pitfalls", "Standard student projects rely on volatile React state arrays or mock local storage that vanish upon refresh and fail DBMS viva scrutiny."),
        ("Audit & Compliance Failures", "Destructive hard deletes wipe legal healthcare history, breaking medico-legal record-keeping mandates.")
    ]
    for ptitle, pdesc in probs:
        p = ptf1.add_paragraph()
        p.text = f"•  {ptitle}: "
        p.font.bold = True
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_DARK
        run = p.add_run()
        run.text = pdesc
        run.font.bold = False
        run.font.color.rgb = C_MUTED
        p.space_after = Pt(8)

    # Column 2: The Solution
    add_card(slide2, Inches(6.8), Inches(1.7), Inches(5.7), Inches(5.2))
    pbox2 = slide2.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.1), Inches(4.8))
    ptf2 = pbox2.text_frame
    ptf2.word_wrap = True

    h2 = ptf2.paragraphs[0]
    h2.text = "THE MEDITRACK RELATIONAL RESPONSE"
    h2.font.size = Pt(14)
    h2.font.bold = True
    h2.font.color.rgb = C_FOREST
    h2.space_after = Pt(14)

    sols = [
        ("Centralised PostgreSQL Engine", "Single source of truth with 10 relational tables enforcing primary, foreign, and candidate keys."),
        ("Kernel-Level Integrity", "Concurrency protection using GiST exclusion constraints and partial unique indexes directly in PostgreSQL."),
        ("Non-Destructive Soft Deletes", "Entities with historical transactions toggle is_active = false, preserving all audit links."),
        ("Live pgAdmin 4 Inspection", "Every browser action persists to SQL storage, instantly verifiable during DBMS lab demonstrations.")
    ]
    for stitle, sdesc in sols:
        p = ptf2.add_paragraph()
        p.text = f"✔  {stitle}: "
        p.font.bold = True
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_DARK
        run = p.add_run()
        run.text = sdesc
        run.font.bold = False
        run.font.color.rgb = C_MUTED
        p.space_after = Pt(8)

    # =========================================================================
    # SLIDE 3: Full-Stack Architecture
    # =========================================================================
    slide3 = prs.slides.add_slide(blank_layout)
    add_header(slide3, "System Architecture: 3-Tier Enterprise Relational Stack")

    tiers = [
        ("PRESENTATION TIER", "Client Interface (Browser)", C_FOREST, [
            ("React 18 + Vite", "High-performance SPA with TypeScript type safety"),
            ("Tailwind CSS", "Custom clinical design tokens (Slate, Sage, Forest)"),
            ("GSAP & Recharts", "Controlled UI animations and capacity visualization"),
            ("React Hook Form + Zod", "Client-side schema validation matching DB contracts")
        ]),
        ("APPLICATION TIER", "Business Logic & REST API", C_DARK, [
            ("Node.js & Express.js", "Modular MVC controllers and centralized error handling"),
            ("Parameterised pg Client", "Raw SQL query pipeline with zero ORM overhead"),
            ("Zod Server Validation", "Payload sanitisation before reaching SQL queries"),
            ("ACID Transaction Logic", "Multi-table orchestration with explicit BEGIN/COMMIT")
        ]),
        ("DATABASE TIER", "Persistent Relational Engine", C_PINE, [
            ("PostgreSQL 15+", "ACID relational storage with B-Tree & GiST indexes"),
            ("Triggers & Sequences", "Autonomous code generation (PAT-, DOC-, APT-)"),
            ("Audit Logging Engine", "JSONB state diffing on INSERT, UPDATE, DELETE"),
            ("pgAdmin 4 GUI", "Live table inspection & EXPLAIN ANALYZE viva platform")
        ])
    ]

    tier_w = Inches(3.75)
    tier_gap = Inches(0.24)
    start_tx = Inches(0.8)

    for i, (head, subhead, col, items) in enumerate(tiers):
        tx = start_tx + i * (tier_w + tier_gap)
        add_card(slide3, tx, Inches(1.7), tier_w, Inches(5.2))
        
        # Header banner inside card
        tbanner = slide3.shapes.add_shape(MSO_SHAPE.RECTANGLE, tx, Inches(1.7), tier_w, Inches(0.85))
        tbanner.fill.solid()
        tbanner.fill.fore_color.rgb = col
        tbanner.line.fill.background()

        tbox = slide3.shapes.add_textbox(tx + Inches(0.2), Inches(1.8), tier_w - Inches(0.4), Inches(0.7))
        ttf = tbox.text_frame
        ttf.word_wrap = True
        tp0 = ttf.paragraphs[0]
        tp0.text = head
        tp0.font.size = Pt(12)
        tp0.font.bold = True
        tp0.font.color.rgb = C_WHITE
        
        tp1 = ttf.add_paragraph()
        tp1.text = subhead
        tp1.font.size = Pt(9.5)
        tp1.font.color.rgb = C_SAGE

        # Content list
        cbox = slide3.shapes.add_textbox(tx + Inches(0.25), Inches(2.75), tier_w - Inches(0.5), Inches(4.0))
        ctf = cbox.text_frame
        ctf.word_wrap = True
        for title, desc in items:
            p = ctf.add_paragraph()
            p.text = title
            p.font.bold = True
            p.font.size = Pt(11)
            p.font.color.rgb = C_DARK
            p.space_after = Pt(2)
            
            p_sub = ctf.add_paragraph()
            p_sub.text = desc
            p_sub.font.size = Pt(9.5)
            p_sub.font.color.rgb = C_MUTED
            p_sub.space_after = Pt(10)

    # =========================================================================
    # SLIDE 4: Relational Schema & Normalisation Analysis
    # =========================================================================
    slide4 = prs.slides.add_slide(blank_layout)
    add_header(slide4, "Relational Schema Architecture: 3NF & BCNF Justification")

    # Left: Normalisation Theory Card
    add_card(slide4, Inches(0.8), Inches(1.7), Inches(5.0), Inches(5.2))
    nbox = slide4.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(4.4), Inches(4.8))
    ntf = nbox.text_frame
    ntf.word_wrap = True

    nh0 = ntf.paragraphs[0]
    nh0.text = "NORMALISATION FORM VERIFICATION"
    nh0.font.size = Pt(13)
    nh0.font.bold = True
    nh0.font.color.rgb = C_FOREST
    nh0.space_after = Pt(12)

    norms = [
        ("First Normal Form (1NF)", "All attributes contain atomic values. Multi-drug prescriptions are decomposed into 'prescription_items' rather than CSV text fields."),
        ("Second Normal Form (2NF)", "Every non-prime attribute is fully functionally dependent on the entire primary key. In composite candidate keys (bed_number, ward_name), daily_charge and bed_type depend on the whole key."),
        ("Third Normal Form (3NF)", "Elimination of transitive functional dependencies (X -> Y, Y -> Z). Doctor department details are not stored in appointments; they reference departments(department_id)."),
        ("Boyce-Codd Normal Form (BCNF)", "For every non-trivial functional dependency X -> Y, X is a superkey. Guarantees zero redundancy across clinical records.")
    ]
    for norm_title, norm_desc in norms:
        p = ntf.add_paragraph()
        p.text = f"•  {norm_title}: "
        p.font.bold = True
        p.font.size = Pt(10.5)
        p.font.color.rgb = C_DARK
        r = p.add_run()
        r.text = norm_desc
        r.font.bold = False
        r.font.color.rgb = C_MUTED
        p.space_after = Pt(8)

    # Right: Entity Relationships Table
    add_card(slide4, Inches(6.1), Inches(1.7), Inches(6.4), Inches(5.2))
    rbox = slide4.shapes.add_textbox(Inches(6.3), Inches(1.9), Inches(6.0), Inches(4.8))
    rtf = rbox.text_frame
    rtf.word_wrap = True

    rh0 = rtf.paragraphs[0]
    rh0.text = "CORE RELATIONAL ENTITY MATRIX"
    rh0.font.size = Pt(13)
    rh0.font.bold = True
    rh0.font.color.rgb = C_FOREST
    rh0.space_after = Pt(10)

    # Create table for entity relationships
    table_shape = slide4.shapes.add_table(7, 3, Inches(6.3), Inches(2.4), Inches(6.0), Inches(4.2))
    table = table_shape.table
    table.columns[0].width = Inches(1.5)
    table.columns[1].width = Inches(1.5)
    table.columns[2].width = Inches(3.0)

    headers = ["Master Table", "Child Table", "Cardinality & Integrity Rule"]
    for j, h in enumerate(headers):
        cell = table.cell(0, j)
        cell.text = h
        cell.fill.solid()
        cell.fill.fore_color.rgb = C_FOREST
        for p in cell.text_frame.paragraphs:
            p.font.bold = True
            p.font.size = Pt(10)
            p.font.color.rgb = C_WHITE

    rel_data = [
        ("patients", "appointments", "1 : M  (ON DELETE RESTRICT - clinical history)"),
        ("patients", "admissions", "1 : M  (Partial Unique Index on active stay)"),
        ("doctors", "prescriptions", "1 : M  (Physician attribution integrity)"),
        ("prescriptions", "prescription_items", "1 : M  (ON DELETE CASCADE - 1NF item decomposition)"),
        ("bills", "bill_items", "1 : M  (ON DELETE CASCADE - itemized services)"),
        ("bills", "payments", "1 : M  (Ledger audit trail with transaction refs)")
    ]
    for row_idx, (m, c, rule) in enumerate(rel_data):
        cell_m = table.cell(row_idx + 1, 0)
        cell_m.text = m
        cell_c = table.cell(row_idx + 1, 1)
        cell_c.text = c
        cell_r = table.cell(row_idx + 1, 2)
        cell_r.text = rule
        for cell in (cell_m, cell_c, cell_r):
            cell.fill.solid()
            cell.fill.fore_color.rgb = C_WHITE if row_idx % 2 == 0 else C_BG
            for p in cell.text_frame.paragraphs:
                p.font.size = Pt(9)
                p.font.color.rgb = C_DARK

    # =========================================================================
    # SLIDE 5: Advanced PostgreSQL Constraints & GiST Exclusion
    # =========================================================================
    slide5 = prs.slides.add_slide(blank_layout)
    add_header(slide5, "Advanced Database Constraints: Anti-Double-Booking Architecture")

    # Left: Doctor GiST Exclusion Constraint
    add_card(slide5, Inches(0.8), Inches(1.7), Inches(5.7), Inches(5.2))
    gbox = slide5.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(5.1), Inches(4.8))
    gtf = gbox.text_frame
    gtf.word_wrap = True

    gh0 = gtf.paragraphs[0]
    gh0.text = "PHYSICIAN ANTI-DOUBLE-BOOKING (GiST)"
    gh0.font.size = Pt(13)
    gh0.font.bold = True
    gh0.font.color.rgb = C_FOREST
    gh0.space_after = Pt(6)

    gp1 = gtf.add_paragraph()
    gp1.text = "Prevents overlapping appointments for the same doctor at the PostgreSQL engine level using Generalized Search Tree (GiST) range indexing:"
    gp1.font.size = Pt(10)
    gp1.font.color.rgb = C_MUTED
    gp1.space_after = Pt(8)

    sql1 = (
        "ALTER TABLE appointments\n"
        "ADD CONSTRAINT prevent_doctor_double_booking\n"
        "EXCLUDE USING gist (\n"
        "  doctor_id WITH =,\n"
        "  tstzrange(appointment_start, appointment_end) WITH &&\n"
        ") WHERE (status NOT IN ('Cancelled', 'No Show'));"
    )
    gp_code = gtf.add_paragraph()
    gp_code.text = sql1
    gp_code.font.name = "Courier New"
    gp_code.font.size = Pt(9.5)
    gp_code.font.color.rgb = C_DARK
    gp_code.space_after = Pt(8)

    gp2 = gtf.add_paragraph()
    gp2.text = "• B-Tree vs GiST: Standard B-Tree indexes cannot check interval overlaps (&&). GiST indexes 2D bounding boxes of (scalar, time-interval)."
    gp2.font.size = Pt(9.5)
    gp2.font.color.rgb = C_MUTED

    # Right: Bed Partial Unique Index & Domain Constraints
    add_card(slide5, Inches(6.8), Inches(1.7), Inches(5.7), Inches(5.2))
    bbox = slide5.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.1), Inches(4.8))
    btf = bbox.text_frame
    btf.word_wrap = True

    bh0 = btf.paragraphs[0]
    bh0.text = "BED OCCUPANCY & DOMAIN INTEGRITY"
    bh0.font.size = Pt(13)
    bh0.font.bold = True
    bh0.font.color.rgb = C_FOREST
    bh0.space_after = Pt(6)

    bp1 = btf.add_paragraph()
    bp1.text = "1. Partial Unique Index (One Inpatient Per Bed):"
    bp1.font.bold = True
    bp1.font.size = Pt(10.5)
    bp1.font.color.rgb = C_DARK

    sql2 = (
        "CREATE UNIQUE INDEX uq_active_bed_admission\n"
        "ON admissions(bed_id)\n"
        "WHERE status = 'Active';"
    )
    bp_code2 = btf.add_paragraph()
    bp_code2.text = sql2
    bp_code2.font.name = "Courier New"
    bp_code2.font.size = Pt(9.5)
    bp_code2.font.color.rgb = C_DARK
    bp_code2.space_after = Pt(10)

    bp2 = btf.add_paragraph()
    bp2.text = "2. Enforced Domain CHECK Constraints:"
    bp2.font.bold = True
    bp2.font.size = Pt(10.5)
    bp2.font.color.rgb = C_DARK

    checks = [
        "CHECK (appointment_end > appointment_start) — Temporal sequence",
        "CHECK (consultation_fee >= 0) — Non-negative pricing",
        "CHECK (daily_charge >= 0) — Bed inventory pricing integrity",
        "CHECK (gender IN ('Male','Female','Other',...)) — Controlled vocabulary",
        "UNIQUE (bed_number, ward_name) — Disjoint room numbering"
    ]
    for chk in checks:
        p = btf.add_paragraph()
        p.text = f"✔  {chk}"
        p.font.size = Pt(9.5)
        p.font.color.rgb = C_MUTED
        p.space_after = Pt(3)

    # =========================================================================
    # SLIDE 6: Transactional Workflows & ACID Guarantees
    # =========================================================================
    slide6 = prs.slides.add_slide(blank_layout)
    add_header(slide6, "Operational Workflows: ACID Guarantees in Patient Admissions")

    add_card(slide6, Inches(0.8), Inches(1.7), Inches(11.733), Inches(5.2))
    abox = slide6.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(11.1), Inches(4.8))
    atf = abox.text_frame
    atf.word_wrap = True

    ah0 = atf.paragraphs[0]
    ah0.text = "INPATIENT ADMISSION & DISCHARGE TRANSACTION SEQUENCE"
    ah0.font.size = Pt(13)
    ah0.font.bold = True
    ah0.font.color.rgb = C_FOREST
    ah0.space_after = Pt(12)

    # 4 workflow stage cards horizontally
    stages = [
        ("Step 1: Pessimistic Lock", "SELECT ... FOR UPDATE", [
            "Active patient status validated",
            "Target bed row locked using FOR UPDATE",
            "Prevents race conditions between concurrent admissions"
        ]),
        ("Step 2: Admission Insert", "INSERT INTO admissions", [
            "Auto-generates code: ADM-000001",
            "Records admission_datetime & clinical reason",
            "Partial unique index enforces single active stay"
        ]),
        ("Step 3: Bed State Mutation", "UPDATE beds SET status='Occupied'", [
            "Atomically flips bed from Available to Occupied",
            "Synchronizes ward occupancy metrics",
            "Triggers audit_logs recording row diffs"
        ]),
        ("Step 4: Discharge & Release", "UPDATE beds SET status='Available'", [
            "Discharge timestamp recorded & duration calculated",
            "Admission status updated to Discharged",
            "Bed instantly returned to Available pool"
        ])
    ]

    st_w = Inches(2.65)
    st_gap = Inches(0.18)
    st_y = Inches(2.6)
    st_h = Inches(4.0)

    for idx, (st_title, st_code, st_bullets) in enumerate(stages):
        st_x = Inches(1.1) + idx * (st_w + st_gap)
        scard = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, st_x, st_y, st_w, st_h)
        scard.fill.solid()
        scard.fill.fore_color.rgb = C_BG
        scard.line.color.rgb = C_BORDER
        scard.line.width = Pt(1)

        sbox = slide6.shapes.add_textbox(st_x + Inches(0.15), st_y + Inches(0.2), st_w - Inches(0.3), st_h - Inches(0.4))
        stf = sbox.text_frame
        stf.word_wrap = True

        sp0 = stf.paragraphs[0]
        sp0.text = st_title
        sp0.font.size = Pt(11)
        sp0.font.bold = True
        sp0.font.color.rgb = C_FOREST
        sp0.space_after = Pt(4)

        sp1 = stf.add_paragraph()
        sp1.text = st_code
        sp1.font.name = "Courier New"
        sp1.font.size = Pt(8.5)
        sp1.font.bold = True
        sp1.font.color.rgb = C_DARK
        sp1.space_after = Pt(10)

        for b in st_bullets:
            bp = stf.add_paragraph()
            bp.text = f"• {b}"
            bp.font.size = Pt(9.5)
            bp.font.color.rgb = C_MUTED
            bp.space_after = Pt(6)

    # =========================================================================
    # SLIDE 7: Clinical Prescriptions & Legal Locking
    # =========================================================================
    slide7 = prs.slides.add_slide(blank_layout)
    add_header(slide7, "Clinical Prescription Charting: 1NF Decomposition & Legal Locking")

    # Left: 1NF Decomposition
    add_card(slide7, Inches(0.8), Inches(1.7), Inches(5.7), Inches(5.2))
    p1box = slide7.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(5.1), Inches(4.8))
    p1tf = p1box.text_frame
    p1tf.word_wrap = True

    p1h0 = p1tf.paragraphs[0]
    p1h0.text = "1NF MULTI-MEDICATION DECOMPOSITION"
    p1h0.font.size = Pt(13)
    p1h0.font.bold = True
    p1h0.font.color.rgb = C_FOREST
    p1h0.space_after = Pt(8)

    p1p1 = p1tf.add_paragraph()
    p1p1.text = "Anti-Pattern Rejected: Comma-separated strings (e.g., 'Amoxicillin, Paracetamol') violate 1NF and prevent querying individual drug usage."
    p1p1.font.size = Pt(10)
    p1p1.font.color.rgb = C_CRIMSON
    p1p1.space_after = Pt(8)

    p1p2 = p1tf.add_paragraph()
    p1p2.text = "Relational Implementation: Master header table 'prescriptions' linked to child relation 'prescription_items':"
    p1p2.font.size = Pt(10)
    p1p2.font.color.rgb = C_MUTED
    p1p2.space_after = Pt(8)

    items_schema = [
        "medicine_name VARCHAR(150) NOT NULL",
        "dosage_instructions VARCHAR(200) NOT NULL",
        "route VARCHAR(50) (Oral, IV, IM, Topical)",
        "frequency VARCHAR(50) (Once daily, Twice daily)",
        "duration VARCHAR(50) (5 days, 14 days)",
        "quantity INTEGER CHECK (quantity > 0)",
        "FOREIGN KEY (prescription_id) ON DELETE CASCADE"
    ]
    for it in items_schema:
        p = p1tf.add_paragraph()
        p.text = f"✔  {it}"
        p.font.name = "Courier New"
        p.font.size = Pt(9)
        p.font.color.rgb = C_DARK
        p.space_after = Pt(2)

    # Right: Immutability State Machine
    add_card(slide7, Inches(6.8), Inches(1.7), Inches(5.7), Inches(5.2))
    p2box = slide7.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.1), Inches(4.8))
    p2tf = p2box.text_frame
    p2tf.word_wrap = True

    p2h0 = p2tf.paragraphs[0]
    p2h0.text = "MEDICO-LEGAL FINALISATION LOCK"
    p2h0.font.size = Pt(13)
    p2h0.font.bold = True
    p2h0.font.color.rgb = C_FOREST
    p2h0.space_after = Pt(8)

    states = [
        ("Status: 'Draft'", C_DARK, "Physician can edit dosage, append or delete medicine items, and update diagnostic clinical context freely."),
        ("One-Way Transition: /finalise", C_FOREST, "Prescription is formally signed by the attending doctor. Timestamp and final status recorded into audit log."),
        ("Status: 'Finalised' (LOCKED)", C_CRIMSON, "Becomes an immutable historical legal record. Server intercepts and rejects any subsequent UPDATE or DELETE queries with HTTP 409 Conflict.")
    ]
    for st, col, desc in states:
        p = p2tf.add_paragraph()
        p.text = st
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = col
        p.space_after = Pt(2)

        pd = p2tf.add_paragraph()
        pd.text = desc
        pd.font.size = Pt(9.5)
        pd.font.color.rgb = C_MUTED
        pd.space_after = Pt(12)

    # =========================================================================
    # SLIDE 8: Financial Management & Decimal Precision
    # =========================================================================
    slide8 = prs.slides.add_slide(blank_layout)
    add_header(slide8, "Financial Management: Arbitrary Precision Arithmetic & Ledger Rules")

    cards_fin = [
        ("NUMERIC(12,2) Precision", "Eliminating IEEE 754 Floating-Point Errors", [
            ("The Problem", "JavaScript Number and float4/float8 use IEEE 754 binary representation, causing rounding errors (0.1 + 0.2 = 0.30000000000000004)."),
            ("The Solution", "All currency columns use PostgreSQL NUMERIC(12,2) providing exact base-10 arithmetic across all invoice calculations.")
        ]),
        ("Authoritative Calculations", "Server-Side Mathematical Enforcement", [
            ("Subtotal", "SUM(quantity * unit_price) computed authoritatively by backend."),
            ("Total Amount", "GREATEST(0.00, subtotal - discount_amount + tax_amount)"),
            ("Tamper Protection", "Client-side submitted totals are disregarded; backend validates all mathematical equations before writing.")
        ]),
        ("Ledger Accounting", "Multi-Channel Payment Settlement Rules", [
            ("Settlement Logic", "Outstanding balance = total_amount - SUM(Completed payments)."),
            ("Status Guards", "Failed or Pending transactions do NOT reduce outstanding ledger balance."),
            ("Auto Transition", "When sum(payments) >= total, status transitions from 'Pending' to 'Paid'.")
        ])
    ]

    for i, (head, subhead, pairs) in enumerate(cards_fin):
        fx = Inches(0.8) + i * (Inches(3.75) + Inches(0.24))
        add_card(slide8, fx, Inches(1.7), Inches(3.75), Inches(5.2))

        fbox = slide8.shapes.add_textbox(fx + Inches(0.25), Inches(1.9), Inches(3.25), Inches(4.8))
        ftf = fbox.text_frame
        ftf.word_wrap = True

        fp0 = ftf.paragraphs[0]
        fp0.text = head
        fp0.font.size = Pt(13)
        fp0.font.bold = True
        fp0.font.color.rgb = C_FOREST
        fp0.space_after = Pt(2)

        fp1 = ftf.add_paragraph()
        fp1.text = subhead
        fp1.font.size = Pt(9.5)
        fp1.font.color.rgb = C_MUTED
        fp1.space_after = Pt(14)

        for l1, l2 in pairs:
            p = ftf.add_paragraph()
            p.text = l1
            p.font.bold = True
            p.font.size = Pt(10.5)
            p.font.color.rgb = C_DARK
            p.space_after = Pt(2)

            pd = ftf.add_paragraph()
            pd.text = l2
            pd.font.size = Pt(9.5)
            pd.font.color.rgb = C_MUTED
            pd.space_after = Pt(12)

    # =========================================================================
    # SLIDE 9: Referential Integrity & Audit Trails
    # =========================================================================
    slide9 = prs.slides.add_slide(blank_layout)
    add_header(slide9, "Referential Integrity: Safe Dual-Mode Deletion & Audit Logging")

    # Left: Dual-Mode Deletion
    add_card(slide9, Inches(0.8), Inches(1.7), Inches(5.7), Inches(5.2))
    d1box = slide9.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(5.1), Inches(4.8))
    d1tf = d1box.text_frame
    d1tf.word_wrap = True

    d1h0 = d1tf.paragraphs[0]
    d1h0.text = "SAFE DELETION VS DEACTIVATION"
    d1h0.font.size = Pt(13)
    d1h0.font.bold = True
    d1h0.font.color.rgb = C_FOREST
    d1h0.space_after = Pt(10)

    rules = [
        ("The Golden Healthcare Rule", "Clinical history cannot be erased. Physical deletion of patients or physicians with past appointments or billing violates legal retention mandates."),
        ("Soft Deactivation ('is_active = false')", "Deactivated records remain in the database for historical analytics and reporting, but are excluded from active scheduling dropdowns."),
        ("Guarded Hard Deletion", "Permitted strictly for records created by clerical error with zero linked encounters. Backend checks foreign key child records before issuing DELETE."),
        ("Referential Integrity Guardrails", "If child records exist, backend aborts and returns HTTP 409 Conflict with an explanatory clinical rationale.")
    ]
    for rt, rd in rules:
        p = d1tf.add_paragraph()
        p.text = f"•  {rt}: "
        p.font.bold = True
        p.font.size = Pt(10.5)
        p.font.color.rgb = C_DARK
        r = p.add_run()
        r.text = rd
        r.font.bold = False
        r.font.color.rgb = C_MUTED
        p.space_after = Pt(8)

    # Right: Audit Logging Table
    add_card(slide9, Inches(6.8), Inches(1.7), Inches(5.7), Inches(5.2))
    d2box = slide9.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.1), Inches(4.8))
    d2tf = d2box.text_frame
    d2tf.word_wrap = True

    d2h0 = d2tf.paragraphs[0]
    d2h0.text = "AUTONOMOUS AUDIT LOGGING SCHEMA"
    d2h0.font.size = Pt(13)
    d2h0.font.bold = True
    d2h0.font.color.rgb = C_FOREST
    d2h0.space_after = Pt(6)

    d2p1 = d2tf.add_paragraph()
    d2p1.text = "The 'audit_logs' table records complete row differentials for every mutating transaction:"
    d2p1.font.size = Pt(10)
    d2p1.font.color.rgb = C_MUTED
    d2p1.space_after = Pt(8)

    audit_cols = [
        ("log_id", "BIGINT PRIMARY KEY", "Sequential audit sequence identifier"),
        ("entity_type", "VARCHAR(50)", "Table affected ('patient', 'appointment', ...)"),
        ("entity_id", "BIGINT", "Target entity surrogate primary key"),
        ("action_type", "VARCHAR(20)", "INSERT, UPDATE, DELETE, CANCEL, FINALISE"),
        ("old_values", "JSONB", "Complete pre-mutation snapshot of table row"),
        ("new_values", "JSONB", "Complete post-mutation snapshot of table row"),
        ("created_at", "TIMESTAMPTZ", "Immutable transaction execution timestamp")
    ]
    for cname, ctype, cdesc in audit_cols:
        p = d2tf.add_paragraph()
        p.text = f"{cname} ({ctype}): "
        p.font.bold = True
        p.font.name = "Courier New"
        p.font.size = Pt(9)
        p.font.color.rgb = C_DARK
        r = p.add_run()
        r.text = cdesc
        r.font.name = "Arial"
        r.font.bold = False
        r.font.size = Pt(9)
        r.font.color.rgb = C_MUTED
        p.space_after = Pt(3)

    # =========================================================================
    # SLIDE 10: Analytical SQL & Reporting Queries
    # =========================================================================
    slide10 = prs.slides.add_slide(blank_layout)
    add_header(slide10, "PostgreSQL Analytics: Complex Joins, Subqueries & Aggregation")

    q_cards = [
        ("Query 1: Cross-Department Workload", "Multi-Table JOINs & Filtered Aggregations", (
            "SELECT dept.department_name,\n"
            "  COUNT(DISTINCT d.doctor_id) AS active_doctors,\n"
            "  COUNT(a.appointment_id) AS total_visits,\n"
            "  COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'Occupied') AS occupied_beds\n"
            "FROM departments dept\n"
            "LEFT JOIN doctors d ON dept.department_id = d.department_id\n"
            "LEFT JOIN appointments a ON dept.department_id = a.department_id\n"
            "LEFT JOIN beds b ON dept.department_id = b.department_id\n"
            "GROUP BY dept.department_id, dept.department_name;"
        )),
        ("Query 2: Unscheduled Patient Audit", "Correlated Subquery with NOT EXISTS", (
            "SELECT p.patient_code, p.full_name, p.phone\n"
            "FROM patients p\n"
            "WHERE NOT EXISTS (\n"
            "  SELECT 1 FROM appointments a\n"
            "  WHERE a.patient_id = p.patient_id\n"
            ")\n"
            "ORDER BY p.registered_at DESC;"
        )),
        ("Query 3: Doctor Performance Metric", "GROUP BY & HAVING Filtration", (
            "SELECT d.full_name, dept.department_name,\n"
            "  COUNT(a.appointment_id) AS completed_visits,\n"
            "  SUM(d.consultation_fee) AS estimated_revenue\n"
            "FROM doctors d\n"
            "JOIN departments dept ON d.department_id = dept.department_id\n"
            "JOIN appointments a ON d.doctor_id = a.doctor_id\n"
            "WHERE a.status = 'Completed'\n"
            "GROUP BY d.doctor_id, d.full_name, dept.department_name\n"
            "HAVING COUNT(a.appointment_id) >= 2;"
        ))
    ]

    for idx, (qhead, qsub, qsql) in enumerate(q_cards):
        qx = Inches(0.8) + idx * (Inches(3.75) + Inches(0.24))
        add_card(slide10, qx, Inches(1.7), Inches(3.75), Inches(5.2))

        qbox = slide10.shapes.add_textbox(qx + Inches(0.2), Inches(1.9), Inches(3.35), Inches(4.8))
        qtf = qbox.text_frame
        qtf.word_wrap = True

        qp0 = qtf.paragraphs[0]
        qp0.text = qhead
        qp0.font.size = Pt(11)
        qp0.font.bold = True
        qp0.font.color.rgb = C_FOREST
        qp0.space_after = Pt(2)

        qp1 = qtf.add_paragraph()
        qp1.text = qsub
        qp1.font.size = Pt(9)
        qp1.font.color.rgb = C_MUTED
        qp1.space_after = Pt(10)

        qp_sql = qtf.add_paragraph()
        qp_sql.text = qsql
        qp_sql.font.name = "Courier New"
        qp_sql.font.size = Pt(8.5)
        qp_sql.font.color.rgb = C_DARK

    # =========================================================================
    # SLIDE 11: Security & API Validation Architecture
    # =========================================================================
    slide11 = prs.slides.add_slide(blank_layout)
    add_header(slide11, "Application Security: Defense-in-Depth & Parameterised SQL")

    sec_cards = [
        ("Zero SQL Injection", "100% Parameterised Pipeline", [
            ("Vulnerability Eliminated", "String concatenation (e.g. 'SELECT * FROM patients WHERE id = ' + id) enables catastrophic SQL injection attacks."),
            ("Implementation", "All queries use parameterized $1, $2 placeholders through the PostgreSQL binary protocol driver, rendering injected SQL inert.")
        ]),
        ("Dual-Tier Schema Validation", "Synchronized Zod Schemas", [
            ("Client Tier", "React forms validate inputs via Zod resolvers before dispatching HTTP network requests."),
            ("Server Tier", "Express routers execute strict Zod schema parsing on req.body and req.query, rejecting unauthorized keys or malformed data with HTTP 400.")
        ]),
        ("Database Exception Mapping", "Structured Error Middleware", [
            ("PostgreSQL 23505", "Maps duplicate unique key violations into clean 'Record already exists' responses."),
            ("PostgreSQL 23503", "Maps foreign key constraint violations into descriptive relational dependency conflict errors.")
        ])
    ]

    for idx, (shead, ssub, spairs) in enumerate(sec_cards):
        sx = Inches(0.8) + idx * (Inches(3.75) + Inches(0.24))
        add_card(slide11, sx, Inches(1.7), Inches(3.75), Inches(5.2))

        sbox = slide11.shapes.add_textbox(sx + Inches(0.25), Inches(1.9), Inches(3.25), Inches(4.8))
        stf = sbox.text_frame
        stf.word_wrap = True

        sp0 = stf.paragraphs[0]
        sp0.text = shead
        sp0.font.size = Pt(13)
        sp0.font.bold = True
        sp0.font.color.rgb = C_FOREST
        sp0.space_after = Pt(2)

        sp1 = stf.add_paragraph()
        sp1.text = ssub
        sp1.font.size = Pt(9.5)
        sp1.font.color.rgb = C_MUTED
        sp1.space_after = Pt(14)

        for l1, l2 in spairs:
            p = stf.add_paragraph()
            p.text = l1
            p.font.bold = True
            p.font.size = Pt(10.5)
            p.font.color.rgb = C_DARK
            p.space_after = Pt(2)

            pd = stf.add_paragraph()
            pd.text = l2
            pd.font.size = Pt(9.5)
            pd.font.color.rgb = C_MUTED
            pd.space_after = Pt(12)

    # =========================================================================
    # SLIDE 12: DBMS Viva Examination Guide & Defense Strategy
    # =========================================================================
    slide12 = prs.slides.add_slide(blank_layout)
    add_header(slide12, "DBMS Viva Defense Guide: Key Examiner Questions & Technical Answers")

    qas = [
        ("Q1: Why use NUMERIC(12,2) over FLOAT for medical billing?",
         "Float types use IEEE 754 binary floating-point representation which cannot accurately represent fractional decimal values like 0.1. In financial and healthcare ledgers, accumulated rounding errors cause ledger mismatches. NUMERIC(12,2) guarantees exact base-10 arbitrary precision arithmetic."),
        ("Q2: How does the GiST index prevent doctor double-booking?",
         "Standard B-Tree indexes only evaluate equality or scalar inequality (<, =). GiST allows indexing temporal range types (tstzrange). When combined with the overlap operator (&&), PostgreSQL evaluates 2D bounding boxes and rejects overlapping intervals before writing to the heap."),
        ("Q3: How do you achieve 1st Normal Form in clinical prescriptions?",
         "By strictly eliminating repeating groups and comma-delimited medicine strings. We decompose prescriptions into a master relation 'prescriptions' (metadata) and a 1-to-many child relation 'prescription_items' (atomic drug, dose, route, duration, quantity)."),
        ("Q4: Why choose Soft Deletion over CASCADE DELETE for patient records?",
         "In healthcare, deleting a patient row with ON DELETE CASCADE would obliterate appointments, historical prescriptions, and unpaid financial bills. Soft deletion (is_active = false) retains all historical integrity while disabling active clinical scheduling.")
    ]

    for idx, (q, a) in enumerate(qas):
        qy = Inches(1.7) + idx * Inches(1.25)
        add_card(slide12, Inches(0.8), qy, Inches(11.733), Inches(1.15))

        qabox = slide12.shapes.add_textbox(Inches(1.0), qy + Inches(0.1), Inches(11.3), Inches(0.95))
        qatf = qabox.text_frame
        qatf.word_wrap = True

        qp = qatf.paragraphs[0]
        qp.text = q
        qp.font.size = Pt(11)
        qp.font.bold = True
        qp.font.color.rgb = C_FOREST
        qp.space_after = Pt(3)

        ap = qatf.add_paragraph()
        ap.text = a
        ap.font.size = Pt(9.5)
        ap.font.color.rgb = C_DARK

    # =========================================================================
    # SLIDE 13: Summary, Demonstration & Deliverables
    # =========================================================================
    slide13 = prs.slides.add_slide(blank_layout)
    add_header(slide13, "Conclusion & Live Demonstration Checklist")

    # Left: Summary Accomplishments
    add_card(slide13, Inches(0.8), Inches(1.7), Inches(5.7), Inches(5.2))
    c1box = slide13.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(5.1), Inches(4.8))
    c1tf = c1box.text_frame
    c1tf.word_wrap = True

    c1h0 = c1tf.paragraphs[0]
    c1h0.text = "CORE ENGINEERING ACHIEVEMENTS"
    c1h0.font.size = Pt(13)
    c1h0.font.bold = True
    c1h0.font.color.rgb = C_FOREST
    c1h0.space_after = Pt(12)

    achievements = [
        ("Full Relational Persistence", "Zero reliance on mock arrays. Complete CRUD coverage across Patients, Doctors, Departments, Appointments, Admissions, Beds, Prescriptions, and Billing."),
        ("ACID Transaction Engine", "Atomic admissions, bed locks with FOR UPDATE, and synchronized bed status updates with automatic rollback on error."),
        ("PostgreSQL Advanced Features", "Versioned migrations, SQL seed scripts, GiST exclusion constraints, partial unique indexes, and audit logs."),
        ("Production-Grade Design", "Restrained clinical visual identity avoiding generic SaaS tropes, designed for authentic hospital operations.")
    ]
    for atitle, adesc in achievements:
        p = c1tf.add_paragraph()
        p.text = f"✔  {atitle}: "
        p.font.bold = True
        p.font.size = Pt(10.5)
        p.font.color.rgb = C_DARK
        r = p.add_run()
        r.text = adesc
        r.font.bold = False
        r.font.color.rgb = C_MUTED
        p.space_after = Pt(8)

    # Right: Live Demonstration Checklist
    add_card(slide13, Inches(6.8), Inches(1.7), Inches(5.7), Inches(5.2))
    c2box = slide13.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.1), Inches(4.8))
    c2tf = c2box.text_frame
    c2tf.word_wrap = True

    c2h0 = c2tf.paragraphs[0]
    c2h0.text = "LIVE LAB DEMONSTRATION PLAYBOOK"
    c2h0.font.size = Pt(13)
    c2h0.font.bold = True
    c2h0.font.color.rgb = C_FOREST
    c2h0.space_after = Pt(12)

    steps = [
        ("1. Frontend Web Interface", "Navigate to http://localhost:5173 to demonstrate live patient registration and appointment conflict validation."),
        ("2. Backend API Health Check", "Inspect http://localhost:5000/api/health confirming PostgreSQL connection pool status."),
        ("3. pgAdmin 4 Inspection", "Open PostgreSQL tables (patients, appointments, audit_logs) in pgAdmin 4 to demonstrate live SQL row persistence after UI actions."),
        ("4. Concurrency & Constraint Check", "Attempt to book overlapping appointments to display PostgreSQL 409 Conflict rejection live in the browser.")
    ]
    for st, sd in steps:
        p = c2tf.add_paragraph()
        p.text = f"{st}: "
        p.font.bold = True
        p.font.size = Pt(10.5)
        p.font.color.rgb = C_DARK
        r = p.add_run()
        r.text = sd
        r.font.bold = False
        r.font.color.rgb = C_MUTED
        p.space_after = Pt(8)

    output_path = "/Users/dhruvkun/meditrack/MediTrack_Presentation.pptx"
    prs.save(output_path)
    print(f"Successfully generated PowerPoint presentation at: {output_path}")

if __name__ == "__main__":
    create_deck()
