import os
import re
from typing import Dict, List, Tuple, Any

def extract_text_from_docx(file_path: str) -> str:
    """Extract plain text from a .docx file."""
    try:
        import docx
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text)
        return "\n\n".join(full_text)
    except Exception as e:
        print(f"Error extracting docx text from {file_path}: {e}")
        return ""

def extract_text_from_pdf(file_path: str) -> str:
    """Extract plain text from a .pdf file."""
    text = ""
    # Try PyMuPDF (fitz) first
    try:
        import fitz
        doc = fitz.open(file_path)
        pages = [page.get_text() for page in doc]
        return "\n\n".join(pages)
    except Exception:
        pass

    # Try pdfplumber second
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
            return "\n\n".join(pages)
    except Exception:
        pass

    # Try pypdf / PyPDF2
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(pages)
    except Exception:
        pass

    return text

def parse_thesis_document(file_path: str) -> str:
    """Detect file type and extract full text."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".docx":
        text = extract_text_from_docx(file_path)
    elif ext == ".pdf":
        text = extract_text_from_pdf(file_path)
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    return text

def extract_metadata_from_text(full_text: str) -> dict:
    """
    Extract student name, index number, title, degree level, and programme from cover page / title page text.
    Handles 2-column and tabular PDF/DOCX layouts cleanly.
    """
    if not full_text:
        return {"student_name": None, "index_number": None, "title": None, "degree_level": None, "programme": None}

    # Focus on first ~3000 characters (cover page & title page)
    cover_text = full_text[:3000]
    lines = [line.strip() for line in cover_text.splitlines() if line.strip()]

    extracted = {
        "student_name": None,
        "index_number": None,
        "title": None,
        "degree_level": None,
        "programme": None
    }

    # 1. Extract Index Number (MUST contain at least 5 digits or standard student ID format)
    index_patterns = [
        r"(?i)(?:index\s+no\.?|index\s+number|student\s+id|student\s+no\.?|student\s+number|reg\.?\s+no\.?|registration\s+number|id\s+number)\s*[:\-\s]*\n?\s*(\d{5,10})",
        r"\b(\d{6,10})\b",
        r"\b([A-Z]{2}\d{5,8}|PG\d{5,8}|BC\d{5,8}|UE\d{5,8}|PS\d{5,8})\b"
    ]
    for pat in index_patterns:
        m = re.search(pat, cover_text)
        if m:
            val = m.group(1).strip()
            # Require at least 5 digits and no header words
            if re.search(r"\d{5,10}", val) and not re.search(r"(?i)\b(name|index|number|by|title|documented)\b", val):
                extracted["index_number"] = val
                break

    # 2. Extract Student Name
    for line in lines:
        # Strip common headers
        clean_line = re.sub(r"(?i)^(documented\s+by|presented\s+by|submitted\s+by|by|name\s+index\s+number|name|index\s+number|student\s+name|index\s+no)[\s:\-]+", "", line).strip()
        
        # Check if line contains both Name and Index Number (e.g. 'Mahfuz Agbor Seidu 3364722')
        m_combined = re.search(r"^([A-Z][a-zA-Z\.\'\-]+\s+[A-Z][a-zA-Z\.\'\-\s]+?)\s+(\d{5,10})$", clean_line)
        if m_combined:
            extracted["student_name"] = m_combined.group(1).strip().title()
            if not extracted["index_number"]:
                extracted["index_number"] = m_combined.group(2).strip()
            break

        # Check labeled patterns
        m_name = re.search(r"(?i)(?:student\s+name|name\s+of\s+student|documented\s+by|presented\s+by|submitted\s+by|by)\s*[:\-\s]+\s*([A-Z][a-zA-Z\.\'\-]+\s+[A-Z][a-zA-Z\.\'\-\s]+)", line)
        if m_name:
            cand = m_name.group(1).strip()
            cand = re.sub(r"(?i)^(name|index\s+number|student\s+id|by)[\s:\-]+", "", cand).strip()
            if len(cand) > 3 and not re.search(r"(?i)\b(university|department|faculty|degree|bsc|mphil|phd|thesis|college|school|index)\b", cand):
                extracted["student_name"] = cand.title()
                break

    # Fallback for student_name if still None
    if not extracted["student_name"]:
        for line in lines[:25]:
            clean_line = re.sub(r"(?i)\b(documented\s+by|name\s+index\s+number|name|index\s+number|student)\b", "", line).strip(" :-")
            clean_line_nodigits = re.sub(r"\s+\d+$", "", clean_line).strip()
            words = clean_line_nodigits.split()
            if 2 <= len(words) <= 4 and all(w[0].isupper() and w.isalpha() for w in words):
                if not re.search(r"(?i)\b(university|department|faculty|college|school|degree|thesis|bank|churn|predictor|introduction|abstract)\b", clean_line_nodigits):
                    extracted["student_name"] = clean_line_nodigits.title()
                    break

    # 3. Extract Thesis Title
    for line in lines[:15]:
        if re.search(r"(?i)\b(kwame nkrumah|university|department|faculty|college|school of|a thesis|a project|submitted to|in partial|documented by|index number|name)\b", line):
            continue
        if len(line) > 5 and not line.isdigit():
            if not re.search(r"(?i)^(by|author|date|march|april|may|june|july|august|september|october|november|december|january|february)\b", line):
                extracted["title"] = line.strip(" :-")
                break

    # 4. Detect Degree Level
    if re.search(r"(?i)\b(ph\.?d|doctor of philosophy|doctoral)\b", cover_text):
        extracted["degree_level"] = "phd"
    elif re.search(r"(?i)\b(m\.?phil|master of philosophy)\b", cover_text):
        extracted["degree_level"] = "mphil"
    elif re.search(r"(?i)\b(m\.?sc|master of science|taught master)\b", cover_text):
        extracted["degree_level"] = "msc"
    elif re.search(r"(?i)\b(b\.?sc|bachelor|undergraduate|bsc|final year project|fyp)\b", cover_text):
        extracted["degree_level"] = "undergraduate"

    # 5. Detect Programme
    prog_match = re.search(r"(?i)\b(?:programme\s+in|department\s+of|degree\s+in|bsc\.?\s+in)\s+([A-Za-z\s]+)", cover_text)
    if prog_match:
        cand_prog = prog_match.group(1).strip()
        if len(cand_prog) < 40:
            extracted["programme"] = cand_prog.title()

    return extracted

CHAPTER_KEYS = [
    "introduction",
    "literature_review",
    "methodology",
    "data_analysis",
    "results",
    "discussion",
    "conclusion",
    "references",
]

# Ordered most-specific first and scanned in this order, because several patterns would otherwise
# collide. The Guide (Section B) sets out two permitted structures:
#
#   Option 1 (monograph):        1 Introduction, 2 Literature Review, 3 Approach and Methodology,
#                                4 Results and Discussion, 5 General Discussion,
#                                6 Conclusions and Recommendations
#   Option 2 (manuscript-based): 1 Introduction, 2 Literature Review, 3 Topical/Thematic chapters,
#                                4 General Discussion, 5 Conclusions and Recommendations
#
# So a bare chapter number is ambiguous across the two options — "Chapter 5" is General Discussion
# under Option 1 but Conclusions under Option 2. Word-based patterns are therefore tried before
# number-based ones, and the number-based fallbacks are resolved against the detected option.
CHAPTER_PATTERNS = [
    ("references",       r"(?i)^(?:references|bibliography|works\s+cited|literature\s+cited)\b"),
    ("literature_review", r"(?i)\b(?:literature\s+review|review\s+of\s+(?:the\s+)?literature|related\s+work|state\s+of\s+the\s+art|technical\s+background)\b"),
    ("methodology",      r"(?i)\b(?:approach\s+and\s+methodology|research\s+methodology|methodology|research\s+design|materials\s+and\s+methods|system\s+architecture)\b"),
    ("conclusion",       r"(?i)\b(?:conclusions?\s+and\s+recommendations?|conclusions?|recommendations?|future\s+work)\b"),
    ("discussion",       r"(?i)\b(?:general\s+discussion|discussion\s+and\s+synthesis)\b"),
    ("data_analysis",    r"(?i)\b(?:data\s+analysis|analysis\s+of\s+data)\b"),
    ("results",          r"(?i)\b(?:results?\s+and\s+discussion|results?\s+and\s+analysis|results?|findings|evaluation|implementation\s+and\s+testing)\b"),
    ("discussion",       r"(?i)\bdiscussion\b"),
    ("introduction",     r"(?i)\b(?:general\s+introduction|introduction|background\s+(?:to\s+)?(?:the\s+)?study)\b"),
]

# Fallback when a heading carries only a chapter number. Keyed by the structural option detected.
NUMBERED_CHAPTER_MAP = {
    "monograph": {
        1: "introduction",
        2: "literature_review",
        3: "methodology",
        4: "results",
        5: "discussion",
        6: "conclusion",
    },
    "manuscript": {
        1: "introduction",
        2: "literature_review",
        3: "methodology",
        4: "discussion",
        5: "conclusion",
    },
}

# A heading line: short, and either "Chapter N ...", a decimal section number, or largely uppercase.
HEADING_RE = re.compile(
    r"^\s*(?:"
    r"chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight)\b"
    r"|\d+(?:\.\d+)*\.?\s+\S"
    r"|[A-Z][A-Z\s,&:'\-/()]{3,}$"
    r")",
    re.IGNORECASE,
)

CHAPTER_NUMBER_RE = re.compile(
    r"(?i)\bchapter\s+(\d+|one|two|three|four|five|six|seven|eight)\b|^\s*(\d+)\.0\b"
)

_WORD_NUMBERS = {
    "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8,
}


def _looks_like_heading(para: str) -> bool:
    """A heading is a short standalone line, not a sentence that happens to contain a keyword."""
    if len(para) > 120:
        return False
    if para.rstrip().endswith((".", "?", "!", ";", ",")) and not re.match(r"(?i)^\s*chapter\b", para):
        return False
    return bool(HEADING_RE.match(para))


def _chapter_number(para: str) -> int | None:
    m = CHAPTER_NUMBER_RE.search(para)
    if not m:
        return None
    token = m.group(1) or m.group(2)
    if not token:
        return None
    token = token.lower()
    if token.isdigit():
        return int(token)
    return _WORD_NUMBERS.get(token)


def detect_structure_option(full_text: str) -> str:
    """
    Decide whether the thesis follows the Guide's Option 1 (monograph) or Option 2
    (manuscript-based) structure.

    Under Option 2 the conclusions land in Chapter 5; under Option 1 they land in Chapter 6. The
    presence of a sixth chapter is therefore the clearest discriminator.
    """
    if not full_text:
        return "monograph"
    if re.search(r"(?i)\bchapter\s+(?:6|six)\b", full_text):
        return "monograph"
    if re.search(r"(?i)\b(?:topical|thematic)\s+chapter", full_text):
        return "manuscript"
    if re.search(r"(?i)\bchapter\s+(?:5|five)\b.{0,80}\bconclusion", full_text):
        return "manuscript"
    return "monograph"


def classify_heading(para: str, structure_option: str) -> str | None:
    """Return the chapter key a heading belongs to, or None if it is not a chapter heading."""
    if not _looks_like_heading(para):
        return None

    for key, pattern in CHAPTER_PATTERNS:
        if re.search(pattern, para):
            return key

    number = _chapter_number(para)
    if number is not None:
        return NUMBERED_CHAPTER_MAP.get(structure_option, {}).get(number)

    return None


def chunk_thesis_by_chapters(full_text: str) -> Dict[str, str]:
    """
    Split the extracted thesis full text into logical chapter chunks.
    Ensures non-empty fallback distribution across chapters.
    """
    chunks: Dict[str, str] = {k: "" for k in CHAPTER_KEYS}

    if not full_text:
        return chunks

    paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [line.strip() for line in full_text.split("\n") if line.strip()]

    structure_option = detect_structure_option(full_text)

    current_chapter = "introduction"
    chapter_buffers: Dict[str, List[str]] = {k: [] for k in chunks.keys()}

    for para in paragraphs:
        matched = classify_heading(para, structure_option)
        if matched:
            current_chapter = matched
        chapter_buffers[current_chapter].append(para)

    for ch_name in chunks.keys():
        chunks[ch_name] = "\n\n".join(chapter_buffers[ch_name])

    # If heading extraction left chapters empty, partition proportionally across 5 sections
    non_empty_count = sum(1 for text in chunks.values() if len(text) > 100)
    if non_empty_count < 3 and len(paragraphs) >= 5:
        total = len(paragraphs)
        p1 = total // 5
        p2 = 2 * total // 5
        p3 = 3 * total // 5
        p4 = 4 * total // 5

        chunks["introduction"] = "\n\n".join(paragraphs[:p1])
        chunks["literature_review"] = "\n\n".join(paragraphs[p1:p2])
        chunks["methodology"] = "\n\n".join(paragraphs[p2:p3])
        chunks["results"] = "\n\n".join(paragraphs[p3:p4])
        chunks["conclusion"] = "\n\n".join(paragraphs[p4:])

    # `results` and `data_analysis` cover the same material in the Guide's Chapter 4, and
    # `discussion` may be folded into it. Mirror across the empty ones so a sub-criterion mapped to
    # one of them is not starved of evidence that was filed under its sibling.
    if chunks["results"] and not chunks["data_analysis"]:
        chunks["data_analysis"] = chunks["results"]
    elif chunks["data_analysis"] and not chunks["results"]:
        chunks["results"] = chunks["data_analysis"]

    if not chunks["discussion"]:
        chunks["discussion"] = chunks["results"] or chunks["data_analysis"]

    return chunks


def extract_document_structure(full_text: str, file_path: str = None) -> Dict[str, Any]:
    """
    Extract structured document elements: chapters, tables, figures, references, TOC entries,
    and metadata for Stage 1.
    """
    chunks = chunk_thesis_by_chapters(full_text)
    paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]

    # Extract chapters
    chapters = []
    chapter_titles = {
        "introduction": "Introduction",
        "literature_review": "Literature Review",
        "methodology": "Approach and Methodology",
        "data_analysis": "Data Analysis",
        "results": "Results and Findings",
        "discussion": "Discussion",
        "conclusion": "Conclusions and Recommendations",
        "references": "References"
    }
    for idx, (k, v) in enumerate(chunks.items(), 1):
        if v and len(v.strip()) > 20:
            words = len(v.split())
            chapters.append({
                "id": f"ch{idx}",
                "key": k,
                "title": chapter_titles.get(k, k.capitalize()),
                "text": v,
                "word_count": words
            })

    # Extract tables and figures via regex captions
    tables = []
    table_matches = re.findall(r"(?i)\b(Table\s+\d+(?:\.\d+)?[:\s].*?)(?=\n\n|\Z)", full_text)
    for idx, t in enumerate(table_matches[:20], 1):
        lines = t.strip().split("\n")
        caption = lines[0] if lines else f"Table {idx}"
        tables.append({"id": f"t{idx}", "caption": caption[:150], "raw": t[:300]})

    figures = []
    fig_matches = re.findall(r"(?i)\b((?:Figure|Fig\.)\s+\d+(?:\.\d+)?[:\s].*?)(?=\n\n|\Z)", full_text)
    for idx, f in enumerate(fig_matches[:20], 1):
        lines = f.strip().split("\n")
        caption = lines[0] if lines else f"Figure {idx}"
        figures.append({"id": f"fig{idx}", "caption": caption[:150]})

    # Extract & analyze images using Groq LLaMA 3.2 Vision API (capped at 5 figures)
    if file_path and file_path.lower().endswith(".pdf") and os.path.exists(file_path):
        try:
            import fitz
            from app.services.vision_service import analyze_figure_image_sync
            doc = fitz.open(file_path)
            extracted_count = 0
            for page_num in range(len(doc)):
                if extracted_count >= 5:
                    break
                page = doc[page_num]
                image_list = page.get_images()
                for img_info in image_list:
                    if extracted_count >= 5:
                        break
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image.get("image")
                    if image_bytes and len(image_bytes) > 5000:
                        caption_hint = figures[extracted_count]["caption"] if extracted_count < len(figures) else f"Figure on page {page_num+1}"
                        analysis = analyze_figure_image_sync(image_bytes, caption_hint)
                        if analysis:
                            if extracted_count < len(figures):
                                figures[extracted_count]["vision_analysis"] = analysis
                            else:
                                figures.append({"id": f"fig{extracted_count+1}", "caption": caption_hint, "vision_analysis": analysis})
                            extracted_count += 1
        except Exception as e:
            print(f"Vision figure extraction notice: {e}")


    # Extract section headings for TOC duplicate detection
    toc_entries = []
    heading_sec_re = re.compile(r"^\s*(\d+(?:\.\d+)+)\s+(.+)$")
    for para in paragraphs:
        m = heading_sec_re.match(para)
        if m and len(para) < 100:
            toc_entries.append({"number": m.group(1), "title": m.group(2).strip()})

    # Extract references
    ref_text = chunks.get("references", "")
    references = []
    if ref_text:
        ref_lines = [r.strip() for r in ref_text.split("\n\n") if len(r.strip()) > 20]
        if not ref_lines:
            ref_lines = [r.strip() for r in ref_text.split("\n") if len(r.strip()) > 30]

        # Check in-text citation for each reference
        body_text = "\n\n".join(v for k, v in chunks.items() if k != "references")
        for idx, ref in enumerate(ref_lines[:100], 1):
            # Try author surname matching
            author_match = re.search(r"^([A-Z][a-zA-Z\-]+)", ref)
            author = author_match.group(1) if author_match else ""
            year_match = re.search(r"\b(19\d\d|20\d\d)\b", ref)
            year = year_match.group(1) if year_match else ""

            cited = False
            if author and len(author) > 2 and author.lower() not in ("the", "and", "a", "an"):
                if year:
                    cited = bool(re.search(rf"\b{re.escape(author)}\b.{0,30}\b{year}\b", body_text, re.IGNORECASE))
                else:
                    cited = author.lower() in body_text.lower()
            elif year:
                cited = year in body_text

            references.append({"raw": ref[:200], "cited_in_text": cited})

    total_words = len(full_text.split())

    return {
        "chapters": chapters,
        "tables": tables,
        "figures": figures,
        "references": references,
        "toc": toc_entries,
        "metadata": {
            "font_info_available": False,
            "spacing_info_available": False,
            "word_count_total": total_words,
            "structure_option": detect_structure_option(full_text)
        }
    }


def run_deterministic_findings(doc_structure: Dict[str, Any], degree_level: str) -> List[Dict[str, Any]]:
    """
    Run deterministic structural checks against extracted document structure.
    Returns findings that are fed into Stage 3 as pre-verified facts.
    """
    findings = []
    degree_level = (degree_level or "mphil").lower()

    # 1. Duplicate section numbers
    numbers_seen = {}
    duplicates = []
    for item in doc_structure.get("toc", []):
        num = item["number"]
        if num in numbers_seen:
            duplicates.append(f"Section {num} appears multiple times ('{numbers_seen[num]}' and '{item['title']}')")
        else:
            numbers_seen[num] = item["title"]

    if duplicates:
        findings.append({
            "check": "duplicate_section_numbers",
            "status": "warning",
            "detail": "; ".join(duplicates[:3])
        })

    # 2. Uncited references
    refs = doc_structure.get("references", [])
    if refs:
        uncited = [r for r in refs if not r["cited_in_text"]]
        if uncited:
            findings.append({
                "check": "uncited_references",
                "status": "info",
                "detail": f"{len(uncited)} of {len(refs)} bibliography entries were not found cited in text."
            })
    else:
        findings.append({
            "check": "references_present",
            "status": "warning",
            "detail": "No explicit references section detected."
        })

    # 3. Word count check
    total_words = doc_structure.get("metadata", {}).get("word_count_total", 0)
    word_thresholds = {
        "phd": (40000, 100000),
        "mphil": (20000, 60000),
        "msc": (10000, 40000),
        "undergraduate": (3000, 20000)
    }
    min_w, max_w = word_thresholds.get(degree_level, (10000, 60000))
    if total_words < min_w:
        findings.append({
            "check": "word_count_conformity",
            "status": "fail" if degree_level in ("phd", "mphil") else "warning",
            "detail": f"Total word count of {total_words:,} words is below the minimum threshold ({min_w:,} words) for {degree_level.upper()}."
        })

    # 4. Check missing chapters
    chap_keys = {c.get("key") for c in doc_structure.get("chapters", [])}
    expected = ["introduction", "methodology", "results", "conclusion"]
    missing = [k for k in expected if k not in chap_keys]
    if missing:
        findings.append({
            "check": "chapter_completeness",
            "status": "warning",
            "detail": f"Missing core chapter sections: {', '.join(missing)}"
        })

    return findings

