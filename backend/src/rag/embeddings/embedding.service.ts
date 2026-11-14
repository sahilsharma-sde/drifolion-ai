import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

/**
 * Embedding model, loaded lazily on the first embed call and run on this
 * server's CPU. The defaults are fine locally. On a small host (e.g. Render's
 * free 512 MB instance) these optional settings reduce memory:
 *   EMBEDDING_BATCH_SIZE  texts embedded per model call (default 16; the
 *                         library's own default of 512 can exhaust small hosts)
 *   EMBEDDING_DTYPE       "q8" loads a quantized model that needs far less RAM
 *   EMBEDDING_MODEL       e.g. "Xenova/bge-small-en-v1.5" (same 384-dim model,
 *                         ONNX build that includes the quantized weights)
 */
const dtype = process.env.EMBEDDING_DTYPE;

export const embeddings = new HuggingFaceTransformersEmbeddings({
  model: process.env.EMBEDDING_MODEL || "BAAI/bge-small-en-v1.5",
  batchSize: Number(process.env.EMBEDDING_BATCH_SIZE) || 16,
  // The library's types predate transformers.js's `dtype` option, but it
  // passes pretrainedOptions straight through to the model loader.
  ...(dtype ? { pretrainedOptions: { dtype } as any } : {}),
});
