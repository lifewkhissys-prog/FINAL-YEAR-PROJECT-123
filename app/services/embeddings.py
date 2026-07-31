import numpy as np
from typing import List, Union

_model = None

def get_embedding_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            from app.config import settings
            _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        except Exception as e:
            print(f"sentence_transformers load failed: {e}. Using deterministic fallback embeddings.")
            _model = "fallback"
    return _model

def generate_embedding(text: str) -> List[float]:
    """Generate 384-dimensional vector embedding for given text."""
    if not text:
        return [0.0] * 384
    model = get_embedding_model()
    if model != "fallback":
        try:
            vec = model.encode(text, normalize_embeddings=True)
            return vec.tolist()
        except Exception as e:
            print(f"Error generating embedding: {e}")

    # Fallback pseudo-embedding (deterministic hash vector)
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
