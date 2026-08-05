import io
import re
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_color: str):
    """Set background shading color of a table cell (e.g. '0F2942' for deep navy)."""
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set inner cell margins in dxa (1 pt = 20 dxa)."""
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def generate_thesis_docx_report(submission, results, summary, narrative_text: str) -> io.BytesIO:
    """
    Generates a professional Word (.docx) assessment document matching the official Critical
    Assessment Report format.

    `summary` carries the aggregate mark and its Appendix 4.1 grade band; pass an empty dict to omit
    the mark table (for example when no criterion was successfully scored).
    """
    doc = Document()

    # Set 1-inch margins on all sides
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # 1. Main Document Header (Matching sample document)
    h_top = doc.add_paragraph()
    r_h_top = h_top.add_run(f"CRITICAL ASSESSMENT REPORT ON {(submission.degree_level or 'THESIS').upper()} THESIS")
    r_h_top.font.name = "Arial"
    r_h_top.font.size = Pt(14)
    r_h_top.font.bold = True
    r_h_top.font.color.rgb = RGBColor(15, 41, 66)  # Deep Navy

    h_sub = doc.add_paragraph()
    r_h_sub = h_sub.add_run("Supervisor’s Review and Corrective Guidance to the Supervisee")
    r_h_sub.font.name = "Arial"
    r_h_sub.font.size = Pt(11)
    r_h_sub.font.italic = True
    r_h_sub.font.color.rgb = RGBColor(90, 90, 90)

    doc.add_paragraph()

    # 2. Metadata Table
    table = doc.add_table(rows=6, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    metadata = [
        ("Candidate", submission.student_name or "N/A"),
        ("Programme", submission.programme or "Master of Science in Information Technology"),
        ("Institution", f"{submission.institution or 'Kwame Nkrumah University of Science and Technology, Kumasi'}"),
        ("Thesis Title", submission.title or "N/A"),
        ("Assessment Type", "Critical Supervisor Assessment"),
        ("Overall Recommendation", submission.supervisor_recommendation or "Acceptable in concept, but corrections are required before final submission")
    ]

    for idx, (label, val) in enumerate(metadata):
        row = table.rows[idx]
        
        # Label cell
        cell_lbl = row.cells[0]
        cell_lbl.width = Inches(2.2)
        set_cell_background(cell_lbl, "F0F4F8")
        set_cell_margins(cell_lbl, top=120, bottom=120, left=150, right=150)
        p_lbl = cell_lbl.paragraphs[0]
        r_lbl = p_lbl.add_run(label)
        r_lbl.font.name = "Arial"
        r_lbl.font.size = Pt(9.5)
        r_lbl.font.bold = True
        r_lbl.font.color.rgb = RGBColor(15, 41, 66)

        # Value cell
        cell_val = row.cells[1]
        cell_val.width = Inches(4.3)
        set_cell_margins(cell_val, top=120, bottom=120, left=150, right=150)
        p_val = cell_val.paragraphs[0]
        r_val = p_val.add_run(val)
        r_val.font.name = "Arial"
        r_val.font.size = Pt(9.5)
        if label == "Overall Recommendation":
            r_val.font.bold = True
            r_val.font.color.rgb = RGBColor(0, 100, 0)

    doc.add_paragraph()

    # 3. Rubric Mark Table — the marks the narrative is based on. Without this the exported report
    #    carries a critique with no scores attached.
    if summary and results:
        h_marks = doc.add_paragraph()
        r_h_marks = h_marks.add_run("Rubric Assessment Summary")
        r_h_marks.font.name = "Arial"
        r_h_marks.font.size = Pt(13)
        r_h_marks.font.bold = True
        r_h_marks.font.color.rgb = RGBColor(15, 41, 66)

        if summary.get("rubric_source"):
            p_src = doc.add_paragraph()
            r_src = p_src.add_run(f"Mark scheme: {summary['rubric_source']}")
            r_src.font.name = "Calibri"
            r_src.font.size = Pt(8.5)
            r_src.font.italic = True
            r_src.font.color.rgb = RGBColor(90, 90, 90)

        # Group sub-criteria under their parent criterion, preserving order of appearance.
        grouped = {}
        for row in results:
            grouped.setdefault(row.get("criterion_name") or "Unassigned", []).append(row)

        headers = ["Criterion / Sub-criterion", "Max", "AI", "Supervisor", "Awarded"]
        mark_col_widths = [Inches(3.3), Inches(0.7), Inches(0.7), Inches(0.9), Inches(0.9)]

        row_count = 1 + sum(len(rows) + 1 for rows in grouped.values()) + 1
        mt = doc.add_table(rows=row_count, cols=len(headers))
        mt.alignment = WD_TABLE_ALIGNMENT.CENTER
        mt.autofit = False

        def _write(cell, text, *, bold=False, size=9, bg=None, align=None, color=None):
            if bg:
                set_cell_background(cell, bg)
            set_cell_margins(cell, top=90, bottom=90, left=110, right=110)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.name = "Calibri"
            r.font.size = Pt(size)
            r.font.bold = bold
            if color:
                r.font.color.rgb = color
            if align is not None:
                p.alignment = align

        # Header
        for c_idx, htext in enumerate(headers):
            cell = mt.rows[0].cells[c_idx]
            cell.width = mark_col_widths[c_idx]
            _write(cell, htext, bold=True, size=9, bg="0F2942",
                   align=WD_ALIGN_PARAGRAPH.CENTER if c_idx else None,
                   color=RGBColor(255, 255, 255))

        r_i = 1
        for crit_name, rows in grouped.items():
            crit_max = sum(x.get("max_marks") or 0.0 for x in rows)
            crit_awarded = sum(x.get("effective_score") or 0.0 for x in rows)

            # Criterion subtotal row
            for c_idx, text in enumerate([
                crit_name, f"{crit_max:g}", "", "", f"{crit_awarded:g}"
            ]):
                cell = mt.rows[r_i].cells[c_idx]
                cell.width = mark_col_widths[c_idx]
                _write(cell, text, bold=True, size=9, bg="EAF0F6",
                       align=WD_ALIGN_PARAGRAPH.CENTER if c_idx else None)
            r_i += 1

            for row in rows:
                awarded = row.get("effective_score")
                ai = row.get("ai_score")
                override = row.get("supervisor_override_score")
                cells = [
                    f"    {row.get('sub_criterion_name') or ''}",
                    f"{row.get('max_marks') or 0:g}",
                    "not scored" if ai is None else f"{ai:g}",
                    "—" if override is None else f"{override:g}",
                    "not scored" if awarded is None else f"{awarded:g}",
                ]
                for c_idx, text in enumerate(cells):
                    cell = mt.rows[r_i].cells[c_idx]
                    cell.width = mark_col_widths[c_idx]
                    _write(cell, text, size=8.5,
                           bg="FFFFFF" if awarded is not None else "FDF3F3",
                           align=WD_ALIGN_PARAGRAPH.CENTER if c_idx else None,
                           color=RGBColor(150, 40, 40) if awarded is None else None)
                r_i += 1

        # Total row
        pct = summary.get("percentage")
        total_cells = [
            f"TOTAL — Grade {summary.get('grade') or '—'} ({summary.get('interpretation') or 'Not graded'})",
            f"{summary.get('max_possible', 0):g}",
            "",
            "",
            f"{summary.get('total_score', 0):g}" + (f"  ({pct}%)" if pct is not None else ""),
        ]
        for c_idx, text in enumerate(total_cells):
            cell = mt.rows[r_i].cells[c_idx]
            cell.width = mark_col_widths[c_idx]
            _write(cell, text, bold=True, size=9, bg="0F2942",
                   align=WD_ALIGN_PARAGRAPH.CENTER if c_idx else None,
                   color=RGBColor(255, 255, 255))

        doc.add_paragraph()

        notes = []
        if summary.get("unscored_criteria"):
            notes.append(
                f"{summary['unscored_criteria']} sub-criterion/criteria could not be scored and are "
                f"excluded from the total and percentage above."
            )
        if summary.get("is_referred") and summary.get("reassessment_cap"):
            notes.append(
                f"A referred thesis may be revised for re-assessment, but the re-assessment mark "
                f"is capped at {summary['reassessment_cap']:g} "
                f"(KNUST HDR Guide 2016, Appendix 4.1)."
            )
        for note in notes:
            p_note = doc.add_paragraph()
            r_note = p_note.add_run(note)
            r_note.font.name = "Calibri"
            r_note.font.size = Pt(8.5)
            r_note.font.italic = True
            r_note.font.color.rgb = RGBColor(150, 40, 40)

        doc.add_paragraph()

    # 4. Parse Markdown Report into Styled Docx Paragraphs and Tables
    lines = narrative_text.split("\n")
    in_table = False
    table_rows_data = []

    def flush_table():
        nonlocal in_table, table_rows_data
        if not table_rows_data:
            return
        
        # Check if first row is header
        headers = table_rows_data[0]
        data_rows = table_rows_data[1:]

        t = doc.add_table(rows=len(table_rows_data), cols=len(headers))
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        t.autofit = False

        col_widths = [Inches(0.6), Inches(1.8), Inches(2.0), Inches(2.1)]

        # Header Row
        hdr_row = t.rows[0]
        for c_idx, cell_text in enumerate(headers):
            cell = hdr_row.cells[c_idx]
            cell.width = col_widths[min(c_idx, len(col_widths)-1)]
            set_cell_background(cell, "0F2942")
            set_cell_margins(cell, top=120, bottom=120, left=120, right=120)
            p = cell.paragraphs[0]
            r = p.add_run(cell_text)
            r.font.name = "Arial"
            r.font.size = Pt(9)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

        # Data Rows
        for r_idx, row_data in enumerate(data_rows):
            row = t.rows[r_idx + 1]
            bg_color = "F9FBFD" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, cell_text in enumerate(row_data):
                if c_idx < len(row.cells):
                    cell = row.cells[c_idx]
                    cell.width = col_widths[min(c_idx, len(col_widths)-1)]
                    set_cell_background(cell, bg_color)
                    set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                    p = cell.paragraphs[0]
                    r = p.add_run(cell_text)
                    r.font.name = "Calibri"
                    r.font.size = Pt(9)
                    if c_idx == 0:
                        r.font.bold = True
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

        doc.add_paragraph()
        table_rows_data = []
        in_table = False

    for line in lines:
        line_str = line.strip()

        # Handle Markdown Table lines (| Col 1 | Col 2 |)
        if line_str.startswith("|") and line_str.endswith("|"):
            parts = [p.strip() for p in line_str.split("|")[1:-1]]
            # Ignore separator line (|---|---|)
            if all(set(p) <= set("-: ") for p in parts):
                continue
            table_rows_data.append(parts)
            in_table = True
            continue
        elif in_table:
            flush_table()

        if not line_str:
            continue

        p = doc.add_paragraph()

        if line_str.startswith("# "):
            r = p.add_run(line_str[2:])
            r.font.name = "Arial"
            r.font.size = Pt(13)
            r.font.bold = True
            r.font.color.rgb = RGBColor(15, 41, 66)
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
        elif line_str.startswith("## "):
            r = p.add_run(line_str[3:])
            r.font.name = "Arial"
            r.font.size = Pt(11)
            r.font.bold = True
            r.font.color.rgb = RGBColor(15, 41, 66)
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(3)
        elif line_str.startswith("### "):
            r = p.add_run(line_str[4:])
            r.font.name = "Arial"
            r.font.size = Pt(10.5)
            r.font.bold = True
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
        elif line_str.startswith("- ") or line_str.startswith("* "):
            p.style = 'List Bullet'
            content = line_str[2:]

            # Bold label before colon if present (e.g. "- **Relevant problem:** text")
            if "**" in content:
                parts = content.split("**")
                for i, part in enumerate(parts):
                    if not part:
                        continue
                    r = p.add_run(part)
                    r.font.name = "Calibri"
                    r.font.size = Pt(10)
                    if i % 2 == 1:
                        r.font.bold = True
            elif ":" in content and len(content.split(":")[0]) < 40:
                label, text = content.split(":", 1)
                r_lbl = p.add_run(label + ":")
                r_lbl.font.name = "Calibri"
                r_lbl.font.size = Pt(10)
                r_lbl.font.bold = True
                
                r_txt = p.add_run(text)
                r_txt.font.name = "Calibri"
                r_txt.font.size = Pt(10)
            else:
                r = p.add_run(content)
                r.font.name = "Calibri"
                r.font.size = Pt(10)
        elif re.match(r'^\d+\.\s', line_str):
            # Numbered list item (e.g. "1. First, ...")
            r = p.add_run(line_str)
            r.font.name = "Calibri"
            r.font.size = Pt(10)
            p.paragraph_format.space_after = Pt(3)
        else:
            # Normal paragraph text with inline bold handling
            if "**" in line_str:
                parts = line_str.split("**")
                for i, part in enumerate(parts):
                    if not part:
                        continue
                    r = p.add_run(part)
                    r.font.name = "Calibri"
                    r.font.size = Pt(10)
                    if i % 2 == 1:
                        r.font.bold = True
            else:
                r = p.add_run(line_str)
                r.font.name = "Calibri"
                r.font.size = Pt(10)

    if in_table:
        flush_table()

    # 4. Add Signature Block at end of document if not present
    doc.add_paragraph()
    p_sig = doc.add_paragraph()
    r_sig = p_sig.add_run("Prepared by: Supervisor\nSignature: _____________________________________\nDate: __________________________________________")
    r_sig.font.name = "Arial"
    r_sig.font.size = Pt(9.5)
    r_sig.font.color.rgb = RGBColor(60, 60, 60)

    # Save to BytesIO stream
    target_stream = io.BytesIO()
    doc.save(target_stream)
    target_stream.seek(0)
    return target_stream
