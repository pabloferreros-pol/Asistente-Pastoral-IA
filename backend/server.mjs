import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";
import PptxGenJS from "pptxgenjs";
import PDFDocument from "pdfkit";
import {
  saturdayPrompt,
  developSermonPrompt,
  transformSermonPrompt,
  visitPrompt,
  ministryPrompt,
  concordancePrompt,
  biblicalWorldPrompt,
} from "./src/prompts.mjs";
import {
  getLibraryStatus,
  startLibraryIndexing,
  searchLibrary,
  getLibrarySourcePage,
  retrieveLibrarySources,
} from "./src/library.mjs";

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");

const exportsDir = path.join(__dirname, "exports");
const materialsFile = path.join(dataDir, "materials.json");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(exportsDir, { recursive: true });

if (!fs.existsSync(materialsFile)) {
  fs.writeFileSync(materialsFile, "[]", "utf8");
}

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/exports", express.static(exportsDir));

const libraryPdfsDir = path.join(__dirname, "library", "pdfs");
fs.mkdirSync(libraryPdfsDir, { recursive: true });

app.use(
  "/library-pdfs",
  express.static(libraryPdfsDir, {
    fallthrough: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "asistente-pastoral-ia",
    model,
    time: new Date().toISOString(),
  });
});

app.get("/api/info", (_req, res) => {
  res.json({
    service: "Asistente Pastoral IA",
    version: "0.7.1",
    cloud: Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID),
    libraryVectorStoreConfigured: Boolean(
      process.env.LIBRARY_VECTOR_STORE_ID
    ),
  });
});

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error("Falta configurar OPENAI_API_KEY en el servidor.");
    err.status = 503;
    throw err;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function runPrompt(prompt) {
  const client = getClient();

  const response = await client.responses.create({
    model,
    input: prompt,
    reasoning: { effort: "low" },
  });

  const text = response.output_text?.trim();

  if (!text) {
    throw new Error("La IA no devolvió texto.");
  }

  return text;
}

async function runStructured(prompt, name, schema, maxOutputTokens = 7000) {
  const client = getClient();

  const response = await client.responses.create({
    model,
    input: prompt,
    reasoning: { effort: "low" },
    max_output_tokens: maxOutputTokens,
    text: {
      format: {
        type: "json_schema",
        name,
        strict: true,
        schema,
      },
    },
  });

  const text = response.output_text?.trim();

  if (!text) {
    const status = response.status || "desconocido";
    const incomplete = response.incomplete_details
      ? JSON.stringify(response.incomplete_details)
      : "";

    throw new Error(
      `La IA no devolvió una respuesta estructurada. Estado: ${status} ${incomplete}`
    );
  }

  return JSON.parse(text);
}

const saturdaySchema = {
  type: "object",
  additionalProperties: false,
  required: ["paths", "recommendation"],
  properties: {
    paths: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "text",
          "title",
          "hook",
          "centralIdea",
          "whyItFits",
          "structure",
          "callDirection",
        ],
        properties: {
          id: {
            type: "integer",
            enum: [1, 2, 3],
          },
          text: { type: "string" },
          title: { type: "string" },
          hook: { type: "string" },
          centralIdea: { type: "string" },
          whyItFits: { type: "string" },
          structure: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "string" },
          },
          callDirection: { type: "string" },
        },
      },
    },
    recommendation: { type: "string" },
  },
};

const sermonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "mainText",
    "centralIdea",
    "hook",
    "introduction",
    "context",
    "movements",
    "illustration",
    "applications",
    "call",
    "finalPrayer",
    "preacherSummary",
  ],
  properties: {
    title: { type: "string" },
    mainText: { type: "string" },
    centralIdea: { type: "string" },
    hook: { type: "string" },
    introduction: { type: "string" },
    context: { type: "string" },

    movements: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "explanation",
          "truth",
          "application",
        ],
        properties: {
          title: { type: "string" },
          explanation: { type: "string" },
          truth: { type: "string" },
          application: { type: "string" },
        },
      },
    },

    illustration: { type: "string" },

    applications: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },

    call: { type: "string" },
    finalPrayer: { type: "string" },

    preacherSummary: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: { type: "string" },
    },
  },
};

function readMaterials() {
  try {
    const raw = fs.readFileSync(materialsFile, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeMaterials(items) {
  fs.writeFileSync(
    materialsFile,
    JSON.stringify(items, null, 2),
    "utf8"
  );
}

function safeFilename(value) {
  return String(value || "sermon")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .toLowerCase();
}

function errorMessage(error, fallback) {
  if (error?.status === 429) {
    return "Se alcanzó temporalmente un límite de la API. Esperá unos segundos y volvé a intentar.";
  }

  if (error?.status === 401) {
    return "La clave de OpenAI no es válida o no está autorizada.";
  }

  if (error?.status === 402) {
    return "La cuenta de API necesita saldo o una forma de pago válida.";
  }

  if (error?.message) {
    console.error("Detalle técnico:", error.message);
  }

  return fallback;
}

function route(promptBuilder, required = []) {
  return async (req, res) => {
    try {
      for (const field of required) {
        if (!String(req.body?.[field] || "").trim()) {
          return res
            .status(400)
            .json({ error: `Falta el campo: ${field}` });
        }
      }

      const result = await runPrompt(promptBuilder(req.body || {}));
      res.json({ result });
    } catch (error) {
      console.error(error);

      const status = Number(error?.status || 500);

      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: errorMessage(
          error,
          "No pude completar la consulta. Revisá el servidor y volvé a intentar."
        ),
      });
    }
  };
}


function saturdayLibraryQuery(data = {}) {
  return [
    data.baseText
      ? `Pasaje bíblico principal: ${data.baseText}.`
      : "",
    `Tema pastoral: ${data.topic || ""}.`,
    `Objetivo: ${data.goal || ""}.`,
    `Audiencia: ${data.audience || ""}.`,
    "Buscar contexto exegético, histórico, doctrinal y pastoral directamente relacionado. Priorizar el pasaje si fue indicado.",
  ]
    .filter(Boolean)
    .join(" ");
}

function sermonLibraryQuery(data = {}) {
  const context = data.context || {};
  const path = data.selectedPath || {};

  return [
    `Pasaje bíblico: ${path.text || context.baseText || ""}.`,
    `Tema: ${context.topic || ""}.`,
    `Idea central propuesta: ${path.centralIdea || ""}.`,
    `Estructura propuesta: ${
      Array.isArray(path.structure)
        ? path.structure.join(" / ")
        : ""
    }.`,
    "Recuperar material exegético, histórico, doctrinal y pastoral útil para desarrollar responsablemente este sermón.",
  ]
    .filter(Boolean)
    .join(" ");
}

app.post("/api/preparame-sabado", async (req, res) => {
  try {
    const required = [
      "event",
      "audience",
      "duration",
      "goal",
      "topic",
    ];

    for (const field of required) {
      if (!String(req.body?.[field] || "").trim()) {
        return res
          .status(400)
          .json({ error: `Falta el campo: ${field}` });
      }
    }

    const wantsLibrary =
      req.body?.useLibrary !== false;

    let sources = [];

    if (wantsLibrary) {
      try {
        sources = await retrieveLibrarySources({
          query: saturdayLibraryQuery(req.body),
          maxResults: 6,
        });

        console.log(
          `Sábado: ${sources.length} fuentes documentales recuperadas.`
        );
      } catch (libraryError) {
        console.error(
          "Biblioteca no disponible para los caminos:",
          libraryError?.message || libraryError
        );
        sources = [];
      }
    }

    const data = await runStructured(
      saturdayPrompt(req.body, sources),
      "saturday_paths",
      saturdaySchema,
      3600
    );

    res.json({
      paths: data.paths,
      recommendation: data.recommendation,
      libraryUsed: sources.length > 0,
      sources,
    });
  } catch (error) {
    console.error("ERROR PREPARAME SABADO:", error);

    const status = Number(error?.status || 500);

    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: errorMessage(
        error,
        "No pude generar los 3 caminos correctamente. Volvé a intentar."
      ),
    });
  }
});

app.post("/api/desarrollar-sermon", async (req, res) => {
  try {
    if (!req.body?.context || !req.body?.selectedPath) {
      return res.status(400).json({
        error: "Falta el contexto o el camino seleccionado.",
      });
    }

    console.log(
      `Desarrollando sermón: ${req.body.selectedPath?.title || "sin título"}`
    );

    const wantsLibrary =
      req.body?.context?.useLibrary !== false;

    let sources = [];

    if (wantsLibrary) {
      try {
        sources = await retrieveLibrarySources({
          query: sermonLibraryQuery(req.body),
          maxResults: 7,
        });

        console.log(
          `Sermón: ${sources.length} fuentes documentales recuperadas.`
        );
      } catch (libraryError) {
        console.error(
          "Biblioteca no disponible para desarrollar sermón:",
          libraryError?.message || libraryError
        );
        sources = [];
      }
    }

    const sermon = await runStructured(
      developSermonPrompt(req.body, sources),
      "pastoral_sermon",
      sermonSchema,
      9000
    );

    console.log(`Sermón generado correctamente: ${sermon.title}`);

    res.json({
      sermon,
      libraryUsed: sources.length > 0,
      sources,
    });
  } catch (error) {
    console.error("ERROR DESARROLLANDO SERMON:", error);

    const status = Number(error?.status || 500);

    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: errorMessage(
        error,
        "No pude desarrollar el sermón. Volvé a intentar."
      ),
    });
  }
});

app.post("/api/transformar-sermon", async (req, res) => {
  try {
    if (!req.body?.type || !req.body?.sermon) {
      return res.status(400).json({
        error: "Falta el tipo de transformación o el sermón.",
      });
    }

    if (!["outline", "whatsapp", "reel"].includes(req.body.type)) {
      return res.status(400).json({
        error: "Tipo de transformación no válido.",
      });
    }

    const result = await runPrompt(transformSermonPrompt(req.body));

    res.json({ result });
  } catch (error) {
    console.error(error);

    res.status(Number(error?.status || 500)).json({
      error: errorMessage(
        error,
        "No pude crear esta versión del sermón."
      ),
    });
  }
});

app.get("/api/materiales", (_req, res) => {
  const items = readMaterials().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  res.json({ items });
});

app.post("/api/materiales", (req, res) => {
  const {
    type,
    title,
    topic,
    sermon,
    content,
    context,
  } = req.body || {};

  if (!title) {
    return res.status(400).json({
      error: "Falta el título del material.",
    });
  }

  const items = readMaterials();

  const item = {
    id: crypto.randomUUID(),
    type: type || "material",
    title,
    topic: topic || "",
    sermon: sermon || null,
    content: content || "",
    context: context || null,
    createdAt: new Date().toISOString(),
  };

  items.push(item);
  writeMaterials(items);

  res.json({ item });
});

app.delete("/api/materiales/:id", (req, res) => {
  const items = readMaterials();
  const next = items.filter(
    (item) => item.id !== req.params.id
  );

  writeMaterials(next);

  res.json({ ok: true });
});

app.post("/api/exportar-documento", async (req, res) => {
  try {
    const { format, title, content } = req.body || {};
    const cleanTitle = String(title || "Material pastoral").trim();
    const cleanContent = String(content || "").trim();

    if (!cleanContent) {
      return res.status(400).json({ error: "Falta el contenido para exportar." });
    }

    const base = `${safeFilename(cleanTitle)}-${Date.now()}`;

    if (format === "word") {
      const fileName = `${base}.docx`;
      const filePath = path.join(exportsDir, fileName);
      const paragraphs = cleanContent.split(/\n+/).filter(Boolean).map((text) => new Paragraph({ text }));
      const doc = new Document({ sections: [{ children: [new Paragraph({ text: cleanTitle, heading: HeadingLevel.TITLE }), ...paragraphs] }] });
      fs.writeFileSync(filePath, await Packer.toBuffer(doc));
      return res.json({ url: `/exports/${encodeURIComponent(fileName)}` });
    }

    if (format === "pdf") {
      const fileName = `${base}.pdf`;
      const filePath = path.join(exportsDir, fileName);
      const pdf = new PDFDocument({ margin: 54, size: "A4", info: { Title: cleanTitle, Author: "ASISTENTE PASTORAL IA" } });
      const stream = fs.createWriteStream(filePath);
      pdf.pipe(stream);
      pdf.fontSize(22).fillColor("#06182A").text(cleanTitle, { align: "center" });
      pdf.moveDown(1.5).fontSize(11).fillColor("#24384A").text(cleanContent, { lineGap: 4, align: "left" });
      pdf.end();
      await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });
      return res.json({ url: `/exports/${encodeURIComponent(fileName)}` });
    }

    return res.status(400).json({ error: "Formato no válido." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No pude generar el documento." });
  }
});

app.post("/api/exportar-sermon", async (req, res) => {
  try {
    const { format, sermon } = req.body || {};

    if (!sermon?.title) {
      return res.status(400).json({
        error: "Falta el sermón para exportar.",
      });
    }

    const base =
      `${safeFilename(sermon.title)}-${Date.now()}`;

    if (format === "word") {
      const fileName = `${base}.docx`;
      const filePath = path.join(exportsDir, fileName);

      const children = [
        new Paragraph({
          text: sermon.title,
          heading: HeadingLevel.TITLE,
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `Texto principal: ${sermon.mainText}`,
              bold: true,
            }),
          ],
        }),

        new Paragraph({
          text: `Idea central: ${sermon.centralIdea}`,
        }),

        new Paragraph({
          text: "Hook",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph(sermon.hook),

        new Paragraph({
          text: "Introducción",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph(sermon.introduction),

        new Paragraph({
          text: "Contexto bíblico",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph(sermon.context),
      ];

      sermon.movements.forEach((m, index) => {
        children.push(
          new Paragraph({
            text: `${index + 1}. ${m.title}`,
            heading: HeadingLevel.HEADING_1,
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "Explicación: ",
                bold: true,
              }),
              new TextRun(m.explanation),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "Verdad central: ",
                bold: true,
              }),
              new TextRun(m.truth),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "Aplicación: ",
                bold: true,
              }),
              new TextRun(m.application),
            ],
          })
        );
      });

      children.push(
        new Paragraph({
          text: "Ilustración",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph(sermon.illustration),

        new Paragraph({
          text: "Aplicaciones concretas",
          heading: HeadingLevel.HEADING_1,
        }),

        ...sermon.applications.map(
          (item) =>
            new Paragraph({
              text: item,
              bullet: { level: 0 },
            })
        ),

        new Paragraph({
          text: "Llamado",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph(sermon.call),

        new Paragraph({
          text: "Oración final",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph(sermon.finalPrayer)
      );

const librarySources = Array.isArray(
  req.body?.context?.librarySources
)
  ? req.body.context.librarySources
  : [];

if (librarySources.length > 0) {
  children.push(
    new Paragraph({
      text: "Fuentes documentales consultadas",
      heading: HeadingLevel.HEADING_1,
    })
  );

  librarySources.forEach((source, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `[${index + 1}] ${source.title || "Fuente"}`,
            bold: true,
          }),
          new TextRun({
            text: ` — ${source.pageLabel || ""}`,
          }),
        ],
      })
    );
  });
}

      const doc = new Document({
        sections: [{ children }],
      });

      const buffer = await Packer.toBuffer(doc);

      fs.writeFileSync(filePath, buffer);

      return res.json({
        url: `/exports/${encodeURIComponent(fileName)}`,
      });
    }

    if (format === "ppt") {
      const fileName = `${base}.pptx`;
      const filePath = path.join(exportsDir, fileName);

      const pptx = new PptxGenJS();

      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "ASISTENTE PASTORAL IA";
      pptx.subject = sermon.mainText;
      pptx.title = sermon.title;
      pptx.company = "ASISTENTE PASTORAL IA";

      let slide = pptx.addSlide();

      slide.addText(sermon.title, {
        x: 0.8,
        y: 1.5,
        w: 11.7,
        h: 1.2,
        fontSize: 30,
        bold: true,
        align: "center",
      });

      slide.addText(sermon.mainText, {
        x: 1.5,
        y: 3.0,
        w: 10.3,
        h: 0.6,
        fontSize: 18,
        align: "center",
      });

      slide = pptx.addSlide();

      slide.addText("Idea central", {
        x: 0.8,
        y: 0.7,
        w: 11.5,
        h: 0.6,
        fontSize: 24,
        bold: true,
      });

      slide.addText(sermon.centralIdea, {
        x: 1.0,
        y: 1.7,
        w: 11.0,
        h: 2.2,
        fontSize: 25,
        valign: "mid",
        align: "center",
      });

      sermon.movements.forEach((m, index) => {
        const s = pptx.addSlide();

        s.addText(`${index + 1}. ${m.title}`, {
          x: 0.8,
          y: 0.6,
          w: 11.5,
          h: 0.7,
          fontSize: 27,
          bold: true,
        });

        s.addText(m.truth, {
          x: 1.0,
          y: 1.8,
          w: 11.0,
          h: 1.5,
          fontSize: 23,
          align: "center",
          valign: "mid",
        });

        s.addText(`Aplicación: ${m.application}`, {
          x: 1.0,
          y: 4.1,
          w: 11.0,
          h: 1.0,
          fontSize: 17,
          italic: true,
          align: "center",
        });
      });

      slide = pptx.addSlide();

      slide.addText("Llamado", {
        x: 0.8,
        y: 0.6,
        w: 11.5,
        h: 0.7,
        fontSize: 27,
        bold: true,
      });

      slide.addText(sermon.call, {
        x: 1.0,
        y: 1.7,
        w: 11.0,
        h: 3.0,
        fontSize: 22,
        valign: "mid",
        align: "center",
      });

const librarySources = Array.isArray(
  req.body?.context?.librarySources
)
  ? req.body.context.librarySources
  : [];

if (librarySources.length > 0) {
  slide = pptx.addSlide();

  slide.addText("Fuentes consultadas", {
    x: 0.8,
    y: 0.6,
    w: 11.5,
    h: 0.7,
    fontSize: 25,
    bold: true,
  });

  const sourceLines = librarySources
    .slice(0, 6)
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title || "Fuente"} — ${source.pageLabel || ""}`
    )
    .join("\\n");

  slide.addText(sourceLines, {
    x: 1.0,
    y: 1.6,
    w: 11.0,
    h: 4.7,
    fontSize: 17,
    breakLine: false,
    valign: "top",
  });
}

      await pptx.writeFile({
        fileName: filePath,
      });

      return res.json({
        url: `/exports/${encodeURIComponent(fileName)}`,
      });
    }

    return res.status(400).json({
      error: "Formato no válido.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "No pude generar el archivo.",
    });
  }
});

app.post("/api/visita", async (req, res) => {
  try {
    const situations = Array.isArray(
      req.body?.situations
    )
      ? req.body.situations.filter(Boolean)
      : [req.body?.situation].filter(Boolean);

    const needs = Array.isArray(req.body?.needs)
      ? req.body.needs.filter(Boolean)
      : [req.body?.need].filter(Boolean);

    if (situations.length === 0) {
      return res.status(400).json({
        error: "Seleccioná al menos una situación.",
      });
    }

    if (!String(req.body?.details || "").trim()) {
      return res.status(400).json({
        error: "Falta describir la situación.",
      });
    }

    if (needs.length === 0) {
      return res.status(400).json({
        error: "Seleccioná al menos una necesidad.",
      });
    }

    const result = await runPrompt(
      visitPrompt({
        ...req.body,
        situations,
        needs,
      })
    );

    res.json({ result });
  } catch (error) {
    console.error(error);

    res.status(Number(error?.status || 500)).json({
      error: errorMessage(
        error,
        "No pude completar la consulta."
      ),
    });
  }
});

app.post(
  "/api/ministerio",
  route(ministryPrompt, ["area", "request"])
);

app.post(
  "/api/concordancia",
  route(concordancePrompt, ["topic", "use"])
);

app.post(
  "/api/mundo-biblico",
  route(biblicalWorldPrompt, ["query", "focus"])
);

app.get("/api/biblioteca/status", (_req, res) => {
  res.json(getLibraryStatus());
});

app.post("/api/biblioteca/configurar", (_req, res) => {
  try {
    const status = startLibraryIndexing();
    res.json(status);
  } catch (error) {
    console.error("ERROR CONFIGURANDO BIBLIOTECA:", error);
    res.status(Number(error?.status || 500)).json({
      error: errorMessage(
        error,
        "No pude iniciar la Biblioteca. Revisá el servidor y volvé a intentar."
      ),
    });
  }
});

app.post("/api/biblioteca/buscar", async (req, res) => {
  try {
    const result = await searchLibrary(req.body || {});
    res.json(result);
  } catch (error) {
    console.error("ERROR BUSCANDO EN BIBLIOTECA:", error);
    const status = Number(error?.status || 500);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: errorMessage(
        error,
        "No pude completar la búsqueda en la Biblioteca."
      ),
    });
  }
});

app.post("/api/biblioteca/fuente", (req, res) => {
  try {
    const result = getLibrarySourcePage(req.body || {});
    res.json(result);
  } catch (error) {
    console.error("ERROR ABRIENDO FUENTE:", error);
    const status = Number(error?.status || 500);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: errorMessage(
        error,
        "No pude abrir la fuente seleccionada."
      ),
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada.",
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(
    `ASISTENTE PASTORAL IA escuchando en puerto ${port}`
  );
});
