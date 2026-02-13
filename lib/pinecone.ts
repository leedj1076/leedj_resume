import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone();
  }
  return pineconeClient;
}

export function getResumeIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME!;
  return getPineconeClient().index(indexName);
}
