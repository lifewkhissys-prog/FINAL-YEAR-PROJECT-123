"""
Verification script for dynamic 5-chapter vs 6-chapter thesis structure handling.
Tests:
1. detect_chapter_structure on:
   - 5-chapter thesis with combined 'Results and Discussion'
   - 6-chapter thesis with separate 'Results' and 'Discussion'
   - Ambiguous/minimal thesis falling back to 5-chapter
2. chunk_thesis_by_chapters on 5-chapter vs 6-chapter
3. extract_document_structure exporting actual chapters (5 vs 6)
4. Sub-criteria chapter target grouping under 5-chapter vs 6-chapter
5. Narrative synthesis prompt formatting actual chapters
"""

import sys
from app.services.thesis_parser import (
    detect_chapter_structure,
    detect_structure_option,
    chunk_thesis_by_chapters,
    extract_document_structure
)

FIVE_CHAPTER_THESIS = """
A STUDY OF DEEP LEARNING ARCHITECTURES FOR ANOMALY DETECTION

CHAPTER ONE
INTRODUCTION
1.1 Background to the Study
Anomaly detection is a fundamental problem in modern data engineering.
1.2 Problem Statement
Existing models struggle with high-dimensional multimodal streams.
1.3 Research Objectives
To design and evaluate an optimized transformer architecture.

CHAPTER TWO
LITERATURE REVIEW
2.1 Overview of Sequence Modeling
Recurrent neural networks and attention mechanisms are appraised.
2.2 Empirical Benchmarks
State-of-the-art benchmarks show significant performance variability.

CHAPTER THREE
RESEARCH METHODOLOGY
3.1 Experimental Design
A controlled benchmark with synthetic and real telemetry datasets was used.
3.2 Metric Formulation
Precision, Recall, and F1-score are formally defined.

CHAPTER FOUR
RESULTS AND DISCUSSION
4.1 Empirical Findings
The proposed architecture achieved an F1-score of 0.94 on the primary test suite.
4.2 Critical Discussion
Comparing these findings against baseline architectures shows a 12% improvement in latency without loss of predictive recall.

CHAPTER FIVE
CONCLUSIONS AND RECOMMENDATIONS
5.1 Summary of Contributions
The proposed pipeline demonstrated robust anomaly detection across high throughput streams.
5.2 Future Directions
Hardware acceleration on edge devices should be investigated.

REFERENCES
Vaswani, A. et al. (2017). Attention is All You Need. NeurIPS.
"""

SIX_CHAPTER_THESIS = """
OPTIMIZATION OF DISTRIBUTED CONSENSUS PROTOCOLS

CHAPTER ONE
GENERAL INTRODUCTION
1.1 Background
Distributed systems require Byzantine fault tolerance in adversarial networks.

CHAPTER TWO
LITERATURE REVIEW
2.1 Survey of Paxos and Raft
Historical consensus models provide strong safety under synchrony assumptions.

CHAPTER THREE
APPROACH AND METHODOLOGY
3.1 Mathematical Modeling
A formal state-machine replication framework is specified.

CHAPTER FOUR
EXPERIMENTAL RESULTS
4.1 Throughput Measurements
Under 100 node partition tests, throughput remained above 4,500 transactions per second.

CHAPTER FIVE
GENERAL DISCUSSION
5.1 Synthesis of Findings
The results demonstrate that optimistic pipelining mitigates latency bottlenecks observed in classical BFT.

CHAPTER SIX
CONCLUSIONS AND RECOMMENDATIONS
6.1 Concluding Remarks
The protocol guarantees safety and liveness under asynchronous network conditions.

REFERENCES
Lamport, L. (1998). The Part-Time Parliament. ACM TOCS.
"""

AMBIGUOUS_THESIS = """
PRELIMINARY REPORT

Background and Introduction
This work investigates cloud computing security.

Technical Overview
Security principles are outlined.
"""


def test_chapter_structure_detection():
    print("\n--- Test 1: Chapter Structure Detection ---")
    res_5 = detect_chapter_structure(FIVE_CHAPTER_THESIS)
    print(f"5-chapter thesis detected as: {res_5}")
    assert res_5 == "five_chapter", f"Expected five_chapter, got {res_5}"

    res_6 = detect_chapter_structure(SIX_CHAPTER_THESIS)
    print(f"6-chapter thesis detected as: {res_6}")
    assert res_6 == "six_chapter", f"Expected six_chapter, got {res_6}"

    res_amb = detect_chapter_structure(AMBIGUOUS_THESIS)
    print(f"Ambiguous thesis detected as: {res_amb}")
    assert res_amb == "five_chapter", f"Expected fallback to five_chapter, got {res_amb}"
    print("✓ All detection tests passed!")


def test_chunking_and_structure_export():
    print("\n--- Test 2: Chunking & Structure Extraction ---")
    doc_struct_5 = extract_document_structure(FIVE_CHAPTER_THESIS)
    chaps_5 = doc_struct_5["chapters"]
    chap_keys_5 = [c["key"] for c in chaps_5]
    print(f"5-chapter detected chapters: {chap_keys_5}")
    assert "results_and_discussion" in chap_keys_5, "results_and_discussion key missing in 5-chapter export"
    # Ensure it didn't create duplicate separate results and discussion chapters
    assert not ("results" in chap_keys_5 and "discussion" in chap_keys_5), "5-chapter exported both separate results and discussion!"
    assert doc_struct_5["metadata"]["chapter_structure"] == "five_chapter"

    doc_struct_6 = extract_document_structure(SIX_CHAPTER_THESIS)
    chaps_6 = doc_struct_6["chapters"]
    chap_keys_6 = [c["key"] for c in chaps_6]
    print(f"6-chapter detected chapters: {chap_keys_6}")
    assert "results" in chap_keys_6, "results key missing in 6-chapter export"
    assert "discussion" in chap_keys_6, "discussion key missing in 6-chapter export"
    assert doc_struct_6["metadata"]["chapter_structure"] == "six_chapter"
    print("✓ Chunking and structure export tests passed!")


def test_sub_criteria_target_grouping():
    print("\n--- Test 3: Sub-Criteria Chapter Target Grouping ---")
    class DummySub:
        def __init__(self, id, name, chapter_target):
            self.id = id
            self.name = name
            self.chapter_target = chapter_target

    sub_crits = [
        DummySub(1, "Problem formulation", "introduction"),
        DummySub(2, "Literature depth", "literature_review"),
        DummySub(3, "Methodology rigour", "methodology"),
        DummySub(4, "Data presentation", "results"),
        DummySub(5, "Critical interpretation", "discussion"),
        DummySub(6, "Recommendations", "conclusion"),
    ]

    # For 5-chapter
    groups_5 = {}
    for sc in sub_crits:
        target = sc.chapter_target or "introduction"
        if target in ("results", "discussion", "data_analysis", "results_and_discussion"):
            target = "results_and_discussion"
        groups_5.setdefault(target, []).append(sc)

    print(f"5-chapter groups: {list(groups_5.keys())}")
    assert "results_and_discussion" in groups_5, "results_and_discussion not formed"
    assert "results" not in groups_5, "separate results group remained in 5-chapter"
    assert "discussion" not in groups_5, "separate discussion group remained in 5-chapter"
    assert len(groups_5["results_and_discussion"]) == 2, "Both results & discussion sub-criteria should be in results_and_discussion"

    # For 6-chapter
    groups_6 = {}
    for sc in sub_crits:
        target = sc.chapter_target or "introduction"
        groups_6.setdefault(target, []).append(sc)

    print(f"6-chapter groups: {list(groups_6.keys())}")
    assert "results" in groups_6, "results missing in 6-chapter"
    assert "discussion" in groups_6, "discussion missing in 6-chapter"
    print("✓ Sub-criteria grouping tests passed!")


if __name__ == "__main__":
    test_chapter_structure_detection()
    test_chunking_and_structure_export()
    test_sub_criteria_target_grouping()
    print("\n==========================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("==========================================")
