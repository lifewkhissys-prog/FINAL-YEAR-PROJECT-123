"""Lightweight embedding service using fastembed (ONNX-based, no PyTorch needed)."""

import logging
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)

_model = None


def _get_model():
    """Lazy-load the embedding model on first use."""
    global _model
    if _model is None:
        from fastembed import TextEmbedding
        from app.config import settings
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _model = TextEmbedding(settings.EMBEDDING_MODEL)
        logger.info("Embedding model loaded successfully.")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts. Returns list of 384-dim vectors."""
    if not texts:
        return []
    model = _get_model()
    embeddings = list(model.embed(texts))
    return [e.tolist() for e in embeddings]


def embed_single(text: str) -> list[float]:
    """Generate embedding for a single text."""
    return embed_texts([text])[0]


def cosine_similarity(a, b) -> float:
    """Compute cosine similarity between two vectors."""
    a = np.array(a)
    b = np.array(b)
    dot = np.dot(a, b)
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    if norm == 0:
        return 0.0
    return float(dot / norm)


def retrieve_top_k(
    query_embedding: list[float],
    candidate_embeddings: list[list[float]],
    candidates: list,
    top_k: int = 3
) -> list:
    """Retrieve top-k candidates by cosine similarity to query embedding."""
    if not candidates or not candidate_embeddings:
        return []
    similarities = [cosine_similarity(query_embedding, ce) for ce in candidate_embeddings]
    top_indices = np.argsort(similarities)[-top_k:][::-1]
    return [candidates[i] for i in top_indices if i < len(candidates)]
