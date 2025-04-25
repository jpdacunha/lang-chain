import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";


// Charger un document PDF
const pdfLoader = new PDFLoader("documents/test.pdf");
const pdfDocs = await pdfLoader.load();
console.log("> pdfDocs -----------------------------------------");
console.log(pdfDocs);
console.log("< pdfDocs -----------------------------------------");

// Charger des documents web
const loader = new CheerioWebBaseLoader("https://js.langchain.com/docs/integrations/document_loaders/web_loaders/spider/");
const docs = await loader.load();
console.log("> docs -----------------------------------------");
console.log(docs);
console.log("< docs -----------------------------------------");

// Fusionner les documents PDF et web
const allDocs = [...pdfDocs, ...docs];

// Découper les documents en morceaux
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 150,
});
const splittedDocs = await splitter.splitDocuments(allDocs);
console.log("> splittedDocs -----------------------------------------");
console.log(splittedDocs);
console.log("< splittedDocs -----------------------------------------");

// Mettre en place les embeddings
const ollamaEmbeddings = new OllamaEmbeddings({
    model: "llama3.2:3b",
    baseUrl: "http://127.0.0.1:11434",
});

// Créer le vector store
const vectorStore = await MemoryVectorStore.fromDocuments(splittedDocs, ollamaEmbeddings);

// Créer le retriever
const retriever = vectorStore.asRetriever({
    k: 3,
});

// Interroger le retriever
const retrieverDocs = await retriever.invoke("In which country was the Pope born?");
console.log("> retrieverDocs -----------------------------------------");
console.log(retrieverDocs);
console.log("< retrieverDocs -----------------------------------------");
