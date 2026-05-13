import os
import unittest

os.environ.setdefault("DATABASE_URL", "postgresql://smartdoc:smartdoc_password@localhost:5432/smartdoc_db")
os.environ.setdefault("GOOGLE_API_KEY", "test-key")

from app.services.query_service import QueryService


class QueryServiceTests(unittest.TestCase):
    def test_cache_key_changes_with_conversation_history(self):
        base_key = QueryService.build_cache_key("What is this?", ["doc-a"], [])
        follow_up_key = QueryService.build_cache_key(
            "What is this?",
            ["doc-a"],
            [{"role": "user", "content": "Use the financial section"}],
        )

        self.assertNotEqual(base_key, follow_up_key)

    def test_map_citations_deduplicates_and_accepts_source_strings(self):
        chunks = [
            {
                "chunk_id": "chunk-1",
                "document_title": "Guide.pdf",
                "page_number": 2,
                "content": "A" * 250,
                "similarity": 0.91,
            },
            {
                "chunk_id": "chunk-2",
                "document_title": "Guide.pdf",
                "page_number": 3,
                "content": "Second source",
                "similarity": 0.82,
            },
        ]

        citations = QueryService.map_citations(["SOURCE 1", 1, "2", "bad"], chunks)

        self.assertEqual([citation["chunk_id"] for citation in citations], ["chunk-1", "chunk-2"])
        self.assertTrue(citations[0]["text_preview"].endswith("..."))


if __name__ == "__main__":
    unittest.main()
