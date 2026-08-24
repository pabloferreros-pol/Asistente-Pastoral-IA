import "dotenv/config";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const libraryDir = path.join(backendDir, "library");
const sourcesDir = path.join(libraryDir, "sources");
const pdfsDir = path.join(libraryDir, "pdfs");
const catalogFile = path.join(libraryDir, "catalog.json");
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(backendDir, "data");

const stateFile = path.join(dataDir, "library-state.json");

fs.mkdirSync(dataDir, { recursive: true });

let indexingPromise = null;
const sourcePageCache = new Map();

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error("Falta configurar OPENAI_API_KEY en el servidor.");
    err.status = 503;
    throw err;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function readCatalog() {
  try {
    const parsed = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("No pude leer catalog.json:", error?.message || error);
    return [];
  }
}

function defaultState() {
  const envVectorStoreId =
    String(process.env.LIBRARY_VECTOR_STORE_ID || "").trim();

  const catalog = readCatalog();

  return {
    vectorStoreId: envVectorStoreId || null,
    status: envVectorStoreId ? "ready" : "not_configured",
    indexed: envVectorStoreId
      ? catalog.map((item) => item.filename)
      : [],
    lastError: null,
    updatedAt: null,
  };
}

function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    const defaults = defaultState();
    const envVectorStoreId =
      String(process.env.LIBRARY_VECTOR_STORE_ID || "").trim();

    if (envVectorStoreId) {
      return {
        ...defaults,
        ...parsed,
        vectorStoreId: envVectorStoreId,
        status: "ready",
        indexed: readCatalog().map(
          (item) => item.filename
        ),
        lastError: null,
      };
    }

    return {
      ...defaults,
      ...parsed,
      indexed: Array.isArray(parsed?.indexed)
        ? parsed.indexed
        : [],
    };
  } catch {
    return defaultState();
  }
}

function writeState(state) {
  fs.writeFileSync(
    stateFile,
    JSON.stringify(
      {
        ...state,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );
}

function publicCatalog(catalog) {
  return catalog.map((item) => ({
    filename: item.filename,
    title: item.title,
    category: item.category,
    categoryLabel: item.categoryLabel,
    pdfPages: item.pdfPages,
    sourcePdf: item.sourcePdf || null,
  }));
}

function cleanFullPageText(value) {
  return String(value || "")
    .replace(/\[(?:FUENTE|CATEGORIA|ORIGEN|LIBRO|SEGMENTO):[^\]]+\]\s*/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function loadSourcePages(filename) {
  if (sourcePageCache.has(filename)) {
    return sourcePageCache.get(filename);
  }

  const sourcePath = path.join(sourcesDir, filename);

  if (!fs.existsSync(sourcePath)) {
    const err = new Error("La fuente local no está disponible.");
    err.status = 404;
    throw err;
  }

  const raw = fs.readFileSync(sourcePath, "utf8");
  const parts = raw.split(/\[PAGINA_PDF:\s*(\d+)\]/g);
  const pages = new Map();

  for (let i = 1; i < parts.length; i += 2) {
    const page = Number(parts[i]);
    let content = String(parts[i + 1] || "");

    // El marcador [LIBRO: ...] de la página siguiente queda al final
    // del bloque anterior después del split. Lo quitamos.
    content = content.replace(/\n*\[LIBRO:[^\]]+\]\s*$/g, "");

    const cleaned = cleanFullPageText(content);

    if (!Number.isFinite(page)) continue;

    if (pages.has(page) && cleaned) {
      pages.set(
        page,
        `${pages.get(page)}\n\n${cleaned}`.trim()
      );
    } else {
      pages.set(page, cleaned);
    }
  }

  sourcePageCache.set(filename, pages);
  return pages;
}

function pageNumbersFromText(value) {
  return Array.from(
    String(value || "").matchAll(/\[PAGINA_PDF:\s*(\d+)\]/g)
  )
    .map((match) => Number(match[1]))
    .filter((n) => Number.isFinite(n));
}

export function getLibrarySourcePage(payload = {}) {
  const filename = String(payload.filename || "").trim();
  const catalog = readCatalog();
  const item = catalog.find((entry) => entry.filename === filename);

  if (!item) {
    const err = new Error("La fuente solicitada no existe en la Biblioteca.");
    err.status = 404;
    throw err;
  }

  const pages = loadSourcePages(filename);
  const totalPages = Number(item.pdfPages || 0);

  let requestedPage = Number(payload.page || 1);
  if (!Number.isFinite(requestedPage)) requestedPage = 1;

  requestedPage = Math.round(requestedPage);
  requestedPage = Math.max(1, requestedPage);

  if (totalPages > 0) {
    requestedPage = Math.min(totalPages, requestedPage);
  }

  let content = pages.get(requestedPage) || "";

  // Si por alguna razón esa página no tiene texto extraído,
  // buscamos la página disponible más cercana.
  if (!content && pages.size > 0) {
    const available = Array.from(pages.keys()).sort((a, b) => a - b);
    let nearest = available[0];

    for (const candidate of available) {
      if (
        Math.abs(candidate - requestedPage) <
        Math.abs(nearest - requestedPage)
      ) {
        nearest = candidate;
      }
    }

    requestedPage = nearest;
    content = pages.get(nearest) || "";
  }

  const pdfAvailable =
    Boolean(item.sourcePdf) &&
    fs.existsSync(path.join(pdfsDir, item.sourcePdf));

  const originalPdfUrl = pdfAvailable
    ? `/library-pdfs/${encodeURIComponent(item.sourcePdf)}#page=${requestedPage}`
    : null;

  return {
    filename: item.filename,
    title: item.title,
    category: item.category,
    categoryLabel: item.categoryLabel,
    currentPage: requestedPage,
    totalPages,
    content:
      content ||
      "No se encontró texto extraído para esta página del documento.",
    originalPdfUrl,
    pdfAvailable,
  };
}

export function getLibraryStatus() {
  const catalog = readCatalog();
  const state = readState();
  const indexed = new Set(state.indexed || []);
  const indexedCount = catalog.filter((item) => indexed.has(item.filename)).length;
  const totalSources = catalog.length;
  const totalPages = catalog.reduce(
    (sum, item) => sum + Number(item.pdfPages || 0),
    0
  );

  let status = state.status;
  if (status === "indexing" && !indexingPromise) status = "paused";
  if (state.vectorStoreId && indexedCount < totalSources && status === "ready") {
    status = "update_available";
  }

  const ready = Boolean(
    state.vectorStoreId &&
      totalSources > 0 &&
      indexedCount === totalSources &&
      status === "ready"
  );

  return {
    ready,
    status,
    vectorStoreId: state.vectorStoreId,
    indexedSources: indexedCount,
    totalSources,
    totalPages,
    lastError: state.lastError || null,
    updatedAt: state.updatedAt || null,
    catalog: publicCatalog(catalog),
  };
}

async function indexLibrary() {
  const client = getClient();
  const catalog = readCatalog();
  let state = readState();

  if (catalog.length === 0) {
    throw new Error("No hay fuentes en backend/library/catalog.json.");
  }

  if (!state.vectorStoreId) {
    console.log("Biblioteca: creando vector store…");
    const vectorStore = await client.vectorStores.create({
      name: "ASISTENTE PASTORAL IA — Biblioteca",
    });
    state = {
      ...state,
      vectorStoreId: vectorStore.id,
      status: "indexing",
      lastError: null,
    };
    writeState(state);
  }

  const indexed = new Set(state.indexed || []);
  state.status = "indexing";
  state.lastError = null;
  writeState(state);

  for (const item of catalog) {
    if (indexed.has(item.filename)) continue;

    const sourcePath = path.join(sourcesDir, item.filename);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Falta la fuente local: ${item.filename}`);
    }

    console.log(`Biblioteca: indexando ${item.title}…`);

    const uploadedFile = await client.files.create({
      file: fs.createReadStream(sourcePath),
      purpose: "assistants",
    });

    await client.vectorStores.files.createAndPoll(state.vectorStoreId, {
      file_id: uploadedFile.id,
    });

    await client.vectorStores.files.update(uploadedFile.id, {
      vector_store_id: state.vectorStoreId,
      attributes: {
        category: item.category,
        title: item.title,
        source_kind: "user_library",
      },
    });

    indexed.add(item.filename);
    state.indexed = Array.from(indexed);
    state.status = "indexing";
    state.lastError = null;
    writeState(state);

    console.log(`Biblioteca: ✓ ${item.title}`);
  }

  state.status = "ready";
  state.lastError = null;
  writeState(state);
  console.log(`Biblioteca lista: ${catalog.length} fuentes indexadas.`);
}

export function startLibraryIndexing() {
  const status = getLibraryStatus();
  if (status.ready) return status;

  if (!indexingPromise) {
    indexingPromise = indexLibrary()
      .catch((error) => {
        console.error("ERROR INDEXANDO BIBLIOTECA:", error);
        const state = readState();
        state.status = "error";
        state.lastError = error?.message || "Error desconocido al indexar.";
        writeState(state);
      })
      .finally(() => {
        indexingPromise = null;
      });
  }

  return {
    ...getLibraryStatus(),
    status: "indexing",
  };
}

function cleanRetrievedText(value) {
  return String(value || "")
    .replace(/\[(?:FUENTE|CATEGORIA|ORIGEN|LIBRO|PAGINA_PDF|SEGMENTO):[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageLabelFromText(value) {
  const matches = pageNumbersFromText(value);

  if (matches.length === 0) return "Página no detectada";

  const unique = Array.from(new Set(matches)).sort((a, b) => a - b);
  if (unique.length === 1) return `PDF pág. ${unique[0]}`;

  const first = unique[0];
  const last = unique[unique.length - 1];
  return first === last ? `PDF pág. ${first}` : `PDF págs. ${first}–${last}`;
}

function sourceFromResult(result, index, catalogByFilename) {
  const rawText = Array.isArray(result.content)
    ? result.content
        .filter((part) => part?.type === "text")
        .map((part) => part.text || "")
        .join("\n")
    : "";

  const catalogItem = catalogByFilename.get(result.filename) || {};
  const excerpt = cleanRetrievedText(rawText);
  const pageNumbers = Array.from(
    new Set(pageNumbersFromText(rawText))
  ).sort((a, b) => a - b);

  return {
    id: `${result.file_id || result.filename || "source"}-${index}`,
    fileId: result.file_id || "",
    filename: result.filename || catalogItem.filename || "Fuente",
    title:
      result.attributes?.title ||
      catalogItem.title ||
      result.filename ||
      "Fuente",
    category:
      result.attributes?.category || catalogItem.category || "otro",
    categoryLabel: catalogItem.categoryLabel || "Biblioteca",
    pageLabel: pageLabelFromText(rawText),
    pageStart: pageNumbers.length > 0 ? pageNumbers[0] : null,
    pageEnd:
      pageNumbers.length > 0
        ? pageNumbers[pageNumbers.length - 1]
        : null,
    score: Number(result.score || 0),
    excerpt:
      excerpt.length > 1000 ? `${excerpt.slice(0, 997).trim()}…` : excerpt,
  };
}

function dedupeSources(sources) {
  const seen = new Set();
  const output = [];

  for (const source of sources) {
    const key = `${source.filename}|${source.pageLabel}|${source.excerpt.slice(0, 120)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(source);
    if (output.length >= 7) break;
  }
  return output;
}

const synthesisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "pastoralUse", "evidenceLevel"],
  properties: {
    answer: { type: "string" },
    pastoralUse: { type: "string" },
    evidenceLevel: {
      type: "string",
      enum: ["alta", "media", "limitada"],
    },
  },
};

async function synthesizeFromSources(query, sources) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";

  const evidence = sources
    .map(
      (source, index) => `\n[FUENTE ${index + 1}]\nTítulo: ${source.title}\nCategoría: ${source.categoryLabel}\nUbicación: ${source.pageLabel}\nFragmento recuperado:\n${source.excerpt}\n`
    )
    .join("\n");

  const prompt = `
Sos el motor documental de ASISTENTE PASTORAL IA.

CONSULTA DEL PASTOR:
${query}

EVIDENCIA RECUPERADA DE SU BIBLIOTECA:
${evidence}

REGLAS OBLIGATORIAS:
- Respondé solamente con información respaldada por los fragmentos provistos.
- No atribuyas una idea a una fuente si no aparece en el fragmento recuperado.
- No inventes páginas, autores, citas textuales ni referencias.
- Podés sintetizar y relacionar lo que dicen varias fuentes.
- Cuando una afirmación importante dependa de una fuente, indicá [1], [2], etc.
- Si la evidencia no alcanza para responder una parte de la consulta, decilo explícitamente.
- No presentes una inferencia pastoral como si fuera una afirmación textual de la fuente.
- La sección pastoral debe ser una aplicación responsable derivada de la evidencia, no una nueva investigación.
- Escribí en español claro, pastoral y sobrio.

En "answer" entregá una síntesis documental de 2 a 5 párrafos.
En "pastoralUse" explicá en un párrafo cómo podría aprovecharse responsablemente en estudio, predicación o ministerio.
En "evidenceLevel" elegí alta, media o limitada según cuán directamente respondan los fragmentos a la consulta.
`;

  const response = await client.responses.create({
    model,
    input: prompt,
    reasoning: { effort: "low" },
    max_output_tokens: 2600,
    text: {
      format: {
        type: "json_schema",
        name: "library_grounded_answer",
        strict: true,
        schema: synthesisSchema,
      },
    },
  });

  const text = response.output_text?.trim();
  if (!text) throw new Error("La IA no devolvió la síntesis de biblioteca.");
  return JSON.parse(text);
}


export async function retrieveLibrarySources(payload = {}) {
  const query = String(payload.query || "").trim();
  const category = String(payload.category || "all").trim();
  const maxResults = Math.max(
    1,
    Math.min(Number(payload.maxResults || 7), 10)
  );

  if (!query) return [];

  const status = getLibraryStatus();

  // For sermon generation the library is an enhancement, not a blocker.
  // If it is not ready, simply continue without documentary evidence.
  if (!status.ready || !status.vectorStoreId) {
    return [];
  }

  const client = getClient();
  const catalog = readCatalog();
  const catalogByFilename = new Map(
    catalog.map((item) => [item.filename, item])
  );

  const searchParams = {
    query,
    max_num_results: Math.min(maxResults + 3, 10),
    rewrite_query: true,
  };

  if (category && category !== "all") {
    searchParams.attribute_filter = {
      type: "eq",
      key: "category",
      value: category,
    };
  }

  const results = await client.vectorStores.search(
    status.vectorStoreId,
    searchParams
  );

  const mapped = (results.data || []).map(
    (result, index) =>
      sourceFromResult(
        result,
        index,
        catalogByFilename
      )
  );

  const useful = mapped.filter(
    (source) =>
      source.excerpt &&
      source.score >= 0.12
  );

  return dedupeSources(
    useful.length > 0 ? useful : mapped
  ).slice(0, maxResults);
}

export async function searchLibrary(payload = {}) {
  const query = String(payload.query || "").trim();
  const category = String(payload.category || "all").trim();

  if (!query) {
    const err = new Error("Escribí una pregunta, tema o pasaje para buscar.");
    err.status = 400;
    throw err;
  }

  const status = getLibraryStatus();
  if (!status.ready || !status.vectorStoreId) {
    const err = new Error("La Biblioteca todavía no está lista para buscar.");
    err.status = 409;
    throw err;
  }

  const client = getClient();
  const catalog = readCatalog();
  const catalogByFilename = new Map(catalog.map((item) => [item.filename, item]));

  const searchParams = {
    query,
    max_num_results: 10,
    rewrite_query: true,
  };

  if (category && category !== "all") {
    searchParams.attribute_filter = {
      type: "eq",
      key: "category",
      value: category,
    };
  }

  const results = await client.vectorStores.search(status.vectorStoreId, searchParams);

  const mapped = (results.data || []).map((result, index) =>
    sourceFromResult(result, index, catalogByFilename)
  );

  const useful = mapped.filter((source) => source.excerpt && source.score >= 0.12);
  const sources = dedupeSources(useful.length > 0 ? useful : mapped);

  if (sources.length === 0) {
    return {
      query,
      rewrittenQuery: results.search_query || query,
      answer:
        "No encontré fragmentos suficientemente relacionados con esta consulta dentro de la Biblioteca piloto.",
      pastoralUse:
        "Probá reformulando la pregunta, usando un pasaje bíblico concreto o ampliando la búsqueda a todas las categorías.",
      evidenceLevel: "limitada",
      sources: [],
    };
  }

  const synthesis = await synthesizeFromSources(query, sources);

  return {
    query,
    rewrittenQuery: results.search_query || query,
    ...synthesis,
    sources,
  };
}
