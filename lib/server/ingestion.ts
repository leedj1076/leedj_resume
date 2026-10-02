import { KnowledgeEntrySchema, type KnowledgeEntry } from "../domain/knowledge";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../domain/models";
import {
  buildEnrichedText,
  buildKnowledgeMetadata,
  KNOWLEDGE_SOURCE_OWNER,
  type KnowledgeMetadata,
} from "../rag/knowledge-metadata";

const BATCH_SIZE = 100;
const NAMESPACE = "resume";

export type ExistingVector = { id: string; sourceOwner?: string };
export type IngestionPlan = {
  createIds: string[];
  updateIds: string[];
  deleteIds: string[];
  preservedIds: string[];
};
export type IngestionReport = {
  plan: IngestionPlan;
  dryRun: boolean;
  indexWouldBeCreated: boolean;
  upsertedCount: number;
  deletedCount: number;
};
export type KnowledgeVector = {
  id: string;
  values: number[];
  metadata: KnowledgeMetadata;
};

export interface IngestionGateway {
  indexExists(): Promise<boolean>;
  createIndex(): Promise<void>;
  listPage(token?: string): Promise<{ ids: string[]; next?: string }>;
  fetchMetadata(
    ids: string[],
  ): Promise<Record<string, { source_owner?: string }>>;
  embed(texts: string[]): Promise<number[][]>;
  upsert(vectors: KnowledgeVector[]): Promise<void>;
  deleteIds(ids: string[]): Promise<void>;
}

function validateEntries(entries: readonly KnowledgeEntry[]): KnowledgeEntry[] {
  const seen = new Set<string>();
  return entries.map((candidate) => {
    const entry = KnowledgeEntrySchema.parse(candidate);
    if (entry.chunk_id.startsWith("dj-correction-"))
      throw new Error(`Reserved correction ID: ${entry.chunk_id}`);
    if (seen.has(entry.chunk_id))
      throw new Error(`Duplicate source ID: ${entry.chunk_id}`);
    seen.add(entry.chunk_id);
    return entry;
  });
}

export function planIngestion(
  entries: readonly KnowledgeEntry[],
  existing: readonly ExistingVector[],
): IngestionPlan {
  const source = validateEntries(entries);
  const sourceIds = new Set(source.map((entry) => entry.chunk_id));
  const existingIds = new Set(existing.map((vector) => vector.id));
  const plan: IngestionPlan = {
    createIds: [],
    updateIds: [],
    deleteIds: [],
    preservedIds: [],
  };
  for (const entry of source) {
    (existingIds.has(entry.chunk_id) ? plan.updateIds : plan.createIds).push(
      entry.chunk_id,
    );
  }
  for (const vector of existing) {
    if (sourceIds.has(vector.id)) continue;
    if (
      vector.id.startsWith("dj-correction-") ||
      vector.sourceOwner !== KNOWLEDGE_SOURCE_OWNER
    ) {
      plan.preservedIds.push(vector.id);
    } else {
      plan.deleteIds.push(vector.id);
    }
  }
  return plan;
}

function batches<T>(items: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE)
    result.push(items.slice(i, i + BATCH_SIZE));
  return result;
}

async function inventory(gateway: IngestionGateway): Promise<ExistingVector[]> {
  const ids: string[] = [];
  const seenIds = new Set<string>();
  const seenTokens = new Set<string>();
  let token: string | undefined;
  do {
    const page = await gateway.listPage(token);
    if (!Array.isArray(page.ids))
      throw new Error("Incomplete vector inventory: missing ID list");
    for (const id of page.ids) {
      if (!id || seenIds.has(id))
        throw new Error(
          `Incomplete vector inventory: duplicate or missing ID ${id}`,
        );
      seenIds.add(id);
      ids.push(id);
    }
    token = page.next;
    if (token) {
      if (seenTokens.has(token))
        throw new Error(
          "Incomplete vector inventory: repeated pagination token",
        );
      seenTokens.add(token);
    }
  } while (token);

  const existing: ExistingVector[] = [];
  for (const group of batches(ids)) {
    const found = await gateway.fetchMetadata(group);
    for (const id of group) {
      if (!Object.hasOwn(found, id))
        throw new Error(
          `Incomplete vector inventory: metadata missing for ${id}`,
        );
      existing.push({ id, sourceOwner: found[id]?.source_owner });
    }
  }
  return existing;
}

async function productionGateway(): Promise<IngestionGateway> {
  const [{ Pinecone }, { embedMany }, { openai }] = await Promise.all([
    import("@pinecone-database/pinecone"),
    import("ai"),
    import("@ai-sdk/openai"),
  ]);
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) throw new Error("PINECONE_INDEX_NAME is not configured");
  if (!process.env.PINECONE_API_KEY)
    throw new Error("PINECONE_API_KEY is not configured");
  const client = new Pinecone();
  const namespace = client.index(indexName).namespace(NAMESPACE);
  return {
    async indexExists() {
      return Boolean(
        (await client.listIndexes()).indexes?.some(
          (index) => index.name === indexName,
        ),
      );
    },
    async createIndex() {
      await client.createIndex({
        name: indexName,
        dimension: EMBEDDING_DIMENSIONS,
        metric: "cosine",
        spec: { serverless: { cloud: "aws", region: "us-east-1" } },
        waitUntilReady: true,
      });
    },
    async listPage(token) {
      const page = await namespace.listPaginated(
        token ? { paginationToken: token } : {},
      );
      const ids = (page.vectors ?? []).map((vector) => {
        if (!vector.id)
          throw new Error("Incomplete vector inventory: list item has no ID");
        return vector.id;
      });
      return { ids, next: page.pagination?.next };
    },
    async fetchMetadata(ids) {
      const result = await namespace.fetch({ ids });
      return Object.fromEntries(
        Object.entries(result.records).map(([id, record]) => [
          id,
          {
            source_owner:
              typeof record.metadata?.source_owner === "string"
                ? record.metadata.source_owner
                : undefined,
          },
        ]),
      );
    },
    async embed(texts) {
      return (
        await embedMany({
          model: openai.embedding(EMBEDDING_MODEL),
          values: texts,
        })
      ).embeddings;
    },
    async upsert(vectors) {
      await namespace.upsert({ records: vectors });
    },
    async deleteIds(ids) {
      await namespace.deleteMany({ ids });
    },
  };
}

export async function syncKnowledge(
  entries: readonly KnowledgeEntry[],
  options: { dryRun: boolean },
  gateway?: IngestionGateway,
): Promise<IngestionReport> {
  const source = validateEntries(entries);
  if (!source.length) throw new Error("Cannot synchronize an empty source set");
  const provider = gateway ?? (await productionGateway());
  const exists = await provider.indexExists();
  const existing = exists ? await inventory(provider) : [];
  const plan = planIngestion(source, existing);
  const report: IngestionReport = {
    plan,
    dryRun: options.dryRun,
    indexWouldBeCreated: !exists,
    upsertedCount: 0,
    deletedCount: 0,
  };
  if (options.dryRun) return report;

  const embeddings = await provider.embed(source.map(buildEnrichedText));
  if (
    embeddings.length !== source.length ||
    embeddings.some((values) => values.length !== EMBEDDING_DIMENSIONS)
  ) {
    throw new Error("Embedding count or dimension does not match the source");
  }
  if (!exists) await provider.createIndex();
  const vectors = source.map((entry, index) => ({
    id: entry.chunk_id,
    values: embeddings[index],
    metadata: buildKnowledgeMetadata(entry),
  }));
  for (const batch of batches(vectors)) {
    await provider.upsert(batch);
    report.upsertedCount += batch.length;
  }
  for (const batch of batches(plan.deleteIds)) {
    await provider.deleteIds(batch);
    report.deletedCount += batch.length;
  }
  return report;
}
