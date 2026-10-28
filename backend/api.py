from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend import rag

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_methods=["GET"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

store = rag.get_store()


@app.get("/health")
# returns chunks -> check api works
def health():
    return {
        "chunks": store._collection.count()
    }

@app.get("/search")
def search(query: str, k_neighbours: int = 4):
    # find the source within the vector store
    hits = rag.retrieve(store, query, k_neighbours)
    res = []
    for doc, score in hits:
        res.append({
            "text": doc.page_content,
            "uri": doc.metadata["uri"],
            "score": float(score)
        })
    return {
        "query": query,
        "res": res
    }


@app.get("/ask")
@limiter.limit("3/minute")
def ask(request: Request, query: str, k_neighbours: int = 4):
    # calls rag.ask which send the query and returns an output after llm has processed
    answer, hits = rag.ask(store, query, k_neighbours)
    return {
        "query": query,
        "answer": answer,
        "sources": [
            {"text": d.page_content, "uri": d.metadata["uri"], "score": float(s)}
            for d, s in hits
        ],
    }


# Serve the frontend from the API so requests use the same address and port.
app.mount("/", StaticFiles(directory=Path(__file__).resolve().parent.parent / "frontend", html=True), name="frontend")
