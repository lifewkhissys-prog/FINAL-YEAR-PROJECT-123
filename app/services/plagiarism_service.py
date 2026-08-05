import re
from typing import Dict, List, Any, Tuple
from app.services.embeddings import generate_embedding, cosine_similarity, embeddings_are_degraded

# Local reference passages used for cross-checking. This is a small illustrative set, NOT a
# plagiarism corpus: a low similarity score here means only that the text does not resemble these
# three passages. The KNUST Guide (Literature Review section, and Section 21 of the Graduate
# Handbook) treats plagiarism as grounds for revoking a degree, so this figure must never be
# presented as a cleared plagiarism check.
PROVIDER_NAME = "internal_ngram_vector"

PROVIDER_DESCRIPTION = (
    "Internal n-gram and vector similarity against a local reference set of "
    "{count} passages. Not a commercial plagiarism service."
)

ACADEMIC_CORPUS = [
    {
        "title": "Standard Machine Learning Evaluation Benchmarks",
        "url": "https://doi.org/10.1016/j.patrec.2021.04.012",
        "text": "Machine learning model evaluation requires standardized benchmark datasets and rigorous statistical significance testing to validate performance claims across diverse domains."
    },
    {
        "title": "Automated Essay Scoring & Rubric Decomposition",
        "url": "https://doi.org/10.1109/TLT.2022.3184902",
        "text": "Automated essay scoring systems that utilize rubric decomposition achieve higher inter-rater agreement and reduce holistic grading variance in higher education assessments."
    },
    {
        "title": "Sampling Procedures and Statistical Validity",
        "url": "https://doi.org/10.1080/00220973.2020.1784931",
        "text": "Sampling frame determination must explicitly justify sample size calculation and selection probability to prevent selection bias in empirical survey research."
    }
]

def tokenize_ngrams(text: str, n: int = 3) -> set:
    """Extract clean lowercase n-grams from text."""
    words = re.findall(r'\w+', text.lower())
    if len(words) < n:
        return set(words)
    return set(" ".join(words[i:i+n]) for i in range(len(words) - n + 1))

def compute_jaccard_similarity(text1: str, text2: str, n: int = 3) -> float:
    """Compute n-gram Jaccard similarity percentage between two texts."""
    ngrams1 = tokenize_ngrams(text1, n)
    ngrams2 = tokenize_ngrams(text2, n)
    if not ngrams1 or not ngrams2:
        return 0.0
    intersection = ngrams1.intersection(ngrams2)
    union = ngrams1.union(ngrams2)
    return (len(intersection) / len(union)) * 100.0

async def run_plagiarism_check(full_text: str, chapter_chunks: Dict[str, str]) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Run n-gram and vector similarity of the thesis against a small local reference set, plus an
    internal repetition check across the thesis's own chapters.

    Returns (overall_similarity_score, list_of_section_checks). The score is a similarity index
    against ACADEMIC_CORPUS only — it is not a plagiarism verdict, and callers must present it with
    the provider description attached.

    When no real embedding model is loaded, vector similarity is meaningless (see
    embeddings.embeddings_are_degraded). In that case the vector term is dropped and the score is
    computed from n-gram overlap alone rather than from noise.
    """
    section_checks = []
    check_chapters = ["literature_review", "methodology", "introduction", "discussion"]

    degraded = embeddings_are_degraded()
    ngram_weight, vector_weight = (1.0, 0.0) if degraded else (0.4, 0.6)
    method = "n-gram only (no embedding model available)" if degraded else "n-gram + vector"

    total_sim = 0.0
    count = 0

    for ch_name in check_chapters:
        text = chapter_chunks.get(ch_name, "")
        if not text or len(text.strip()) < 30:
            continue

        matched_sources = []
        max_section_sim = 0.0

        # 1. Compare against reference corpus using n-gram &/or vector similarity
        ch_vec = None if degraded else generate_embedding(text[:1000])

        for corpus_item in ACADEMIC_CORPUS:
            ngram_sim = compute_jaccard_similarity(text, corpus_item["text"], n=3)

            if degraded:
                vec_sim = 0.0
            else:
                corpus_vec = generate_embedding(corpus_item["text"])
                vec_sim = cosine_similarity(ch_vec, corpus_vec) * 100.0

            combined_sim = round((ngram_sim * ngram_weight) + (vec_sim * vector_weight), 1)
            if combined_sim > max_section_sim:
                max_section_sim = combined_sim

            if combined_sim > 12.0:
                matched_sources.append({
                    "source_url": corpus_item["url"],
                    "matched_text": corpus_item["text"],
                    "similarity": combined_sim
                })

        # 2. Self-repetition across the thesis's own chapters. This raises the section score,
        #    because verbatim reuse between chapters is a defect the supervisor should see.
        for other_ch_name, other_text in chapter_chunks.items():
            if other_ch_name != ch_name and len(other_text) > 50:
                rep_sim = compute_jaccard_similarity(text, other_text, n=4)
                if rep_sim > 25.0:
                    matched_sources.append({
                        "source_url": f"Internal Thesis Cross-Check ({other_ch_name})",
                        "matched_text": f"High text repetition between {ch_name} and {other_ch_name}.",
                        "similarity": round(rep_sim, 1)
                    })
                    max_section_sim = max(max_section_sim, rep_sim)

        section_sim = round(min(max_section_sim, 100.0), 1)

        section_checks.append({
            "section_name": ch_name,
            "similarity_percentage": section_sim,
            "matched_sources": matched_sources,
            "provider": PROVIDER_NAME,
            "method": method,
            "reference_set_size": len(ACADEMIC_CORPUS),
            "degraded": degraded,
        })

        total_sim += section_sim
        count += 1

    overall_score = round(total_sim / count, 1) if count > 0 else 0.0
    return overall_score, section_checks
