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

CHAPTER_PATTERNS = {
    "introduction": r"(?i)(?:chapter\s+1|1\.0|\bintroduction\b|\bbackground\b)",
    "literature_review": r"(?i)(?:chapter\s+2|2\.0|\bliterature\s+review\b|\brelated\s+work\b|\bstate\s+of\s+the\s+art\b)",
    "methodology": r"(?i)(?:chapter\s+3|3\.0|\bmethodology\b|\bmethods\b|\bresearch\s+design\b|\bsystem\s+architecture\b)",
    "data_analysis": r"(?i)(?:chapter\s+4|4\.0|\bdata\s+analysis\b|\bresults\s+and\s+discussion\b)",
    "results": r"(?i)(?:chapter\s+4|4\.0|\bresults\b|\bfindings\b|\bevaluation\b)",
    "discussion": r"(?i)(?:chapter\s+5|5\.0|\bdiscussion\b)",
    "conclusion": r"(?i)(?:chapter\s+5|6\.0|\bconclusion\b|\brecommendations\b|\bfuture\s+work\b)",
    "references": r"(?i)(?:\breferences\b|\bbibliography\b)"
}

def chunk_thesis_by_chapters(full_text: str) -> Dict[str, str]:
    """
    Split the extracted thesis full text into logical chapter chunks.
    Ensures non-empty fallback distribution across chapters.
    """
    chunks: Dict[str, str] = {
        "introduction": "",
        "literature_review": "",
        "methodology": "",
        "data_analysis": "",
        "results": "",
        "discussion": "",
        "conclusion": "",
        "references": ""
    }

    if not full_text:
        return chunks

    paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [line.strip() for line in full_text.split("\n") if line.strip()]

    current_chapter = "introduction"
    chapter_buffers: Dict[str, List[str]] = {k: [] for k in chunks.keys()}

    for para in paragraphs:
        if len(para) < 150:
            for ch_name, pattern in CHAPTER_PATTERNS.items():
                if re.search(pattern, para):
                    current_chapter = ch_name
                    break
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

    return chunks
