import pandas as pd
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
import os
from dotenv import load_dotenv

load_dotenv()

# Resolve data paths relative to this file so they work regardless of CWD
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_BASE_DIR, "data")
_VECTOR_DB_DIR = os.path.join(_BASE_DIR, "vectorDBs")
_DEFAULT_CSV = os.path.join(_DATA_DIR, "mrbeast.csv")
_DEFAULT_INDEX = os.path.join(_VECTOR_DB_DIR, "mrbeast_faiss_index")


def get_doc(file_path: str):
    """Read a CSV file and return a list of LangChain Documents."""
    df = pd.read_csv(file_path)
    docs = []

    for _, row in df.iterrows():
        content = f"""
TITLE: {row.get("title", "")}

TRANSCRIPT:
{row.get("transcript", "")}

DESCRIPTION:
{row.get("description", "")}
"""
        metadata = {
            "views": row.get("views", ""),
            "length_seconds": row.get("length", ""),
            "publish_date": row.get("publish_date", ""),
            "channel": row.get("channel_title", ""),
            "keywords": row.get("keywords", ""),
        }
        docs.append(Document(page_content=content.strip(), metadata=metadata))

    return docs


def ingest(file_path: str = _DEFAULT_CSV, index_path: str = _DEFAULT_INDEX):
    """
    Build a FAISS vector index from a CSV and save it locally.
    Call this once to (re)build the index; never called at import time.
    """
    docs = get_doc(file_path)
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    db = FAISS.from_documents(docs, embeddings)
    os.makedirs(os.path.dirname(index_path), exist_ok=True)
    db.save_local(index_path)
    print(f"✅ FAISS index saved to: {index_path}")


def get_vb(file_path: str = _DEFAULT_CSV, index_path: str = _DEFAULT_INDEX):
    """
    Load an existing FAISS index from disk.
    Falls back to rebuilding it from the CSV if the index doesn't exist.
    """
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
    )

    if not os.path.exists(index_path):
        print(f"⚠️  FAISS index not found at '{index_path}'. Building from CSV…")
        if not os.path.exists(file_path):
            raise FileNotFoundError(
                f"Neither the FAISS index ('{index_path}') nor the CSV "
                f"('{file_path}') was found. Run ingest() first."
            )
        ingest(file_path, index_path)

    vectorstore = FAISS.load_local(
        index_path,
        embeddings=embeddings,
        allow_dangerous_deserialization=True,
    )
    return vectorstore


# Guard: only run when executed directly, never on import
if __name__ == "__main__":
    ingest()