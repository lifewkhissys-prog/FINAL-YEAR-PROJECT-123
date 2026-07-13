CRITICAL ASSESSMENT REPORT ON MSc THESIS
Supervisor’s Review and Corrective Guidance to the Supervisee
Candidate	Elvis Atiah
Programme	Master of Science in Information Technology
Institution	Department of Computer Science, Kwame Nkrumah University of Science and Technology, Kumasi
Thesis Title	Enhancing Password Authentication with a Hardware-Free, Context-Aware Risk Scoring Model Using Public Datasets
Assessment Type	Critical Supervisor Assessment
Overall Recommendation	Acceptable in concept, but corrections are required before final submission

1. Overall Supervisor’s Assessment
Dear Elvis, I have reviewed your thesis critically. The study addresses a relevant and timely cybersecurity problem: how to strengthen password-based authentication using contextual risk scoring without requiring hardware tokens, biometrics, or costly infrastructure. The thesis is generally well structured and demonstrates a clear attempt to design, implement, and evaluate a practical authentication model using a public dataset. The work has potential for acceptance at the MSc level; however, several technical, methodological, presentation, and referencing issues must be corrected before final submission.
Supervisor’s overall judgement: The thesis should not be submitted in its present form without correction. It is conditionally acceptable after the candidate addresses the major corrections listed in this report, especially the inconsistencies in the performance metric definitions and tables.
2. Major Strengths of the Thesis
    • Relevant research problem: The work addresses a real weakness of password-only authentication and proposes a hardware-free solution suitable for resource-constrained organisations.
    • Clear title and research direction: The title is focused and reflects the core contribution: context-aware risk scoring using public datasets.
    • Good chapter organisation: The thesis follows the expected five-chapter structure: introduction, literature review, methodology, results, and conclusion.
    • Practical implementation: The inclusion of Python prototype code in the appendices strengthens the practical contribution and demonstrates implementation effort.
    • Honest reporting of limitations: The thesis acknowledges that the detection rate is modest and that the CERT dataset is synthetic, which improves academic integrity.
    • Security-usability awareness: The work considers both detection performance and user friction, which is important in authentication research.
3. Major Corrections Required
The following issues must be corrected because they affect the scientific accuracy, credibility, and final defensibility of the thesis.
No.	Issue Identified	Why It Matters	Required Correction
1	Performance metric inconsistency: FAR and FRR are mixed in some tables.	This is the most serious technical error because it affects the interpretation of the results.	Check all tables and text. If FAR is defined as FN/(FN+TP), keep it consistently. If FRR is defined as FP/(FP+TN), keep it consistently. Correct Table 4.5, Table 4.6, Table 4.7, and the abstract where necessary.
2	Password-only baseline contains inconsistent FRR reporting.	A password-only system that allows all credential-valid logins should have FRR = 0% for legitimate users, not 100%.	Correct the baseline table and ensure the explanation in Section 3.12.1 agrees with Chapter Four.
3	The thesis sometimes overstates the practical security value of a model with only 25.43% detection.	A model that misses about 74.57% of malicious logins should be presented as a preliminary or complementary screening layer, not a strong authentication solution.	Use cautious language throughout the abstract, discussion, conclusion, and contribution sections. Emphasise partial improvement rather than strong protection.
4	The same dataset appears to be used for parameter calibration and final evaluation.	This may introduce tuning bias, especially in threshold selection.	Create a clear calibration/evaluation split or explain why the study is an exploratory design. Preferably calibrate thresholds on one subset and report final performance on a separate holdout subset.
5	The scope mentions IP/network reputation and geolocation, but the final model uses temporal deviation, device familiarity, frequency anomaly, and off-hours login.	This creates a mismatch between the declared scope and the actual implemented features.	Revise the scope and methodology so they match the implemented model, or include IP/geolocation features if the dataset supports them.
6	Section numbering and cross-references are inconsistent.	Numbering problems reduce the professional quality of the thesis and confuse readers.	Update the table of contents and all internal references. Sections 3.6, 3.8, and references to Tables 4.6/4.7 must be checked carefully.
7	Literature review is broad but sometimes repetitive and not sufficiently critical.	A master’s thesis should compare and critique prior work, not only describe it.	Reduce repetition, merge overlapping paragraphs, and strengthen the synthesis around the exact research gap: transparent hardware-free risk scoring using public datasets.
8	Some references appear questionable or inconsistently formatted.	Unverified or poorly formatted references weaken academic credibility.	Verify every 2025/2026 citation, check DOI accuracy, remove weak sources, and apply one consistent referencing style throughout.
4. Chapter-by-Chapter Critical Assessment
Chapter One: Introduction
    • The background, problem statement, objectives, and research questions are generally coherent and aligned with the thesis title.
    • The problem statement is relevant, but it should be sharpened by clearly stating what exact limitation in existing RBA systems is being solved.
    • The scope must be revised because it currently lists IP/network reputation and geolocation, while the implemented model mainly uses timestamp and host/device features.
    • The objectives are acceptable, but the main objective may be strengthened as: “To design, implement, and evaluate a hardware-free, context-aware risk-scoring model for enhancing password-based authentication using publicly available authentication logs.”
Chapter Two: Literature Review
    • The review covers authentication mechanisms, MFA, password attacks, context-aware authentication, RBA, risk scoring, public datasets, and usability metrics.
    • However, the chapter is lengthy and sometimes descriptive rather than analytical. The candidate should show clearer comparison among existing models, datasets, evaluation metrics, and deployment limitations.
    • The literature gap should be presented in a more focused way: proprietary datasets, hardware dependency, black-box models, limited usability evaluation, and poor reproducibility.
    • Some citations and author names appear unusual or weak. All sources must be verified for accuracy and academic quality.
Chapter Three: Methodology
    • The methodology gives a clear rule-based design using four contextual features and a weighted scoring equation.
    • The use of the CERT Insider Threat Dataset is appropriate for an exploratory MSc study, but the synthetic nature of the dataset must be emphasised.
    • The candidate should provide more detail on preprocessing, exact feature computation, class labelling, missing values, and how malicious labels were derived.
    • Threshold and weight validation should be strengthened by using a separate calibration set and evaluation set. Using one dataset for both selection and final reporting can overstate robustness.
    • The justification for rule-based modelling is good, but it should be balanced with a clear admission that rule-based simplicity contributes to the modest detection performance.
Chapter Four: Results and Analysis
    • The chapter contains useful tables on dataset distribution, feature distribution, confusion matrix, and sensitivity analysis.
    • The most urgent correction is the inconsistent use of FAR and FRR across definitions, tables, and comparison results.
    • The result should be interpreted more critically: accuracy is high mainly because the data are imbalanced; precision and F1 are more informative.
    • The discussion should explain why device familiarity and off-hours login perform better than frequency anomaly.
    • The threshold sensitivity analysis is valuable, but the table must label FAR/FRR correctly and consistently.
Chapter Five: Conclusions and Recommendations
    • The conclusion appropriately admits that the model is a partial improvement rather than a complete solution.
    • The contribution section should be moderated. The model establishes a baseline but does not yet provide strong operational security assurance.
    • The limitations are useful and should be retained, but the candidate should make them even more direct in the abstract and final conclusion.
    • Recommendations for real-world logs, live deployment, ML comparison, and richer contextual features are appropriate.
5. Technical and Methodological Comments
    • Dataset suitability: The CERT r4.2 dataset is acceptable for experimentation, but because it is synthetic and insider-oriented, it may not represent normal web authentication attacks such as credential stuffing or phishing. This limitation should be central, not secondary.
    • Labelling strategy: Classifying all logins from known insider users as malicious is problematic because an insider may also perform normal logins. This may distort both false positives and false negatives. The candidate should explain this clearly as a threat to validity.
    • Feature engineering: Temporal deviation, device familiarity, and off-hours activity are logical features. Frequency anomaly performed weakly and should be either replaced or discussed as a negative finding.
    • Model formulation: The weighted formula is transparent and easy to audit, which supports the thesis aim. However, the weights still require stronger empirical justification or a separate validation procedure.
    • Evaluation metrics: The thesis should prioritise recall/detection rate, precision, F1 score, FAR, FRR, and step-up frequency. Accuracy should be treated as secondary because of class imbalance.
    • Prototype: The Python code is useful, but it should be accompanied by a short README-style explanation: dataset input, dependencies, execution steps, outputs, and interpretation of results.
6. Formatting, Language, and Referencing Corrections
    • Change “TABLE OF CONTENT” to “TABLE OF CONTENTS”.
    • Update the table of contents after correcting section numbering.
    • Ensure all table captions and figure captions are consistently formatted and cross-referenced in the text.
    • Correct punctuation and citation errors such as repeated fragments and malformed citations.
    • Use one spelling convention consistently, either British English or American English. Since the thesis already uses “behaviour” and “organisations”, British English is recommended.
    • Shorten long paragraphs in Chapter Two to improve readability.
    • Check every reference for author names, year, title, journal/proceedings, volume, issue, pages, and DOI/URL consistency.
    • Avoid using unsupported claims such as “strong protection” when the reported detection rate is modest.
7. Priority Action Plan for the Candidate
1. First, correct all FAR, FRR, detection rate, precision, and F1 calculations and ensure the formulas in tables match the values reported.
2. Second, correct the password-only baseline metrics and rewrite the comparison section accordingly.
3. Third, revise the methodology to include a clear calibration/evaluation split or explicitly label the experiment as exploratory.
4. Fourth, align the scope, features, and implemented model so that the thesis does not claim unused contextual attributes.
5. Fifth, revise Chapter Two to reduce repetition and strengthen the critical synthesis of existing work.
6. Sixth, verify all references and remove weak, unverifiable, or incorrectly formatted sources.
7. Seventh, update all section numbering, table numbering, figure numbering, captions, and the table of contents.
8. Finally, revise the abstract and conclusion so the claims match the actual performance of the model.
8. Final Recommendation
My recommendation is that the thesis is promising and can meet the MSc standard after correction. The topic is relevant, the objectives are generally appropriate, and the implementation effort is evident. However, the thesis currently contains technical inconsistencies in the reporting of performance metrics, especially FAR and FRR, which must be corrected before it can be defended or submitted as a final document. The candidate should revise the thesis carefully and return a corrected version for final supervisor review.
Decision: Corrections required before final submission.
Supervisor’s closing note to the supervisee: Elvis, your work has a good foundation and a relevant research direction. Make the corrections thoroughly, especially the metric corrections and methodological clarification. Do not overstate the results; present the model as a transparent and useful first-layer screening mechanism rather than a complete authentication solution.


Prepared by: Supervisor
Signature: ________________________________
Date: _____________________________________