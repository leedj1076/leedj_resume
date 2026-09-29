import { Pinecone } from "@pinecone-database/pinecone";
import { getPineconeIndexName } from "./server/config";

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY is not configured");
    pineconeClient = new Pinecone();
  }
  return pineconeClient;
}

export function getResumeIndex() {
  const indexName = getPineconeIndexName();
  return getPineconeClient().index(indexName);
}
