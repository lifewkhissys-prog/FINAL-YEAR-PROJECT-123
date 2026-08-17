import os
import numpy as np
from typing import List, Union

# Silence ONNX Runtime GPU discovery warnings on CPU-only cloud servers (e.g. Render)
os.environ.setdefault("ONNXRUNTIME_EXECUTION_PROVIDERS", '["CPUExecutionProvider"]')
os.environ.setdefault("ORT_LOGGING_LEVEL", "3")


_model = None

def get_embedding_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            from app.config import settings
            _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        except Exception:
            try:
                from fastembed import TextEmbedding
                _model = TextEmbedding()
            except Exception as e:
                print(f"Embedding model load failed: {e}. Using deterministic fallback embeddings.")
                _model = "fallback"
    return _model


def embeddings_are_degraded() -> bool:
    """
    True when no real embedding model is loaded and `generate_embedding` is returning hash vectors.

    Those vectors are deterministic but carry no semantic information, so any similarity computed
    from them is noise. Callers that report a similarity figure to a user must check this and
    suppress the figure rather than publish a meaningless number.
    """
    return get_embedding_model() == "fallback"


def generate_embedding(text: str) -> List[float]:
    """Generate dimensional vector embedding for given text."""
    if not text:
        return [0.0] * 384
    model = get_embedding_model()
    if model != "fallback":
        try:
            if hasattr(model, "encode"):
                vec = model.encode(text, normalize_embeddings=True)
                return vec.tolist()
            elif hasattr(model, "embed"):
                embeddings = list(model.embed([text]))
                vec = np.array(embeddings[0])
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                return vec.tolist()
        except Exception as e:
            print(f"Error generating embedding: {e}")

    # Fallback pseudo-embedding: a deterministic hash vector.
    np.random.seed(abs(hash(text)) % (2**32))
    vec = np.random.randn(384)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

