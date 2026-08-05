import os
import re
from typing import Dict, List, Tuple

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
