
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


dotenv.config();

const llm = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7
});

const prompt = ChatPromptTemplate.fromTemplate(`
    Answer the user's question using only information from the context provided.
    If the exact answer is not in the context, say "I don't know".
    If the context is too long, say "Provided context is too long".
    Always answer in french.
    Give a response as short as possible.
    Context: {context}
    Question: {input}
`);

const chain = await createStuffDocumentsChain({
    prompt,
    llm
});

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

const retrievalChain = await createRetrievalChain({
    combineDocsChain: chain,
    retriever,
});

/*const response = await retrievalChain.invoke({
    input: "In which country was the Pope born?",
});*/

const response = await retrievalChain.invoke({
    input: "what is the Pope position regarding LGBTQ community?",
});

console.log(response);

