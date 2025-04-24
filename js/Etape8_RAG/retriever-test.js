import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as dotenv from "dotenv";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";

// Charger un document PDF
const loader = new PDFLoader("documents/test.pdf");
const docs = await loader.load();

// On découpe le contenu de la page web en morceaux de 250 caractères
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 150,
});

// On découpe les documents en morceaux
const splittedDocs = await splitter.splitDocuments(docs);

console.log("> splittedDocs -----------------------------------------");
console.log(splittedDocs);
console.log("< splittedDocs -----------------------------------------");

// On met en place les embeddings
const ollamaEmbeddings = new OllamaEmbeddings({
    model: "mistral:latest",
    baseUrl: "http://127.0.0.1:11434",
});

// On crée le vector store
const vectorStore = await MemoryVectorStore.fromDocuments(splittedDocs, ollamaEmbeddings);

const retriever = vectorStore.asRetriever({
    k: 3,
});

const retrieverDocs = await retriever.invoke("In which country was the Pope born?");

console.log("> retrieverDocs -----------------------------------------");
console.log(retrieverDocs);
console.log("< retrieverDocs -----------------------------------------");