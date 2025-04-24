
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as dotenv from "dotenv";
import { Document } from "@langchain/core/documents";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createRetrievalChain } from "langchain/chains/retrieval";

dotenv.config();

const llm = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7
});

const prompt = ChatPromptTemplate.fromTemplate(`
    Answer the user's question.
    Context: {context}
    Question: {input}
`);

const chain = await createStuffDocumentsChain({
    prompt,
    llm
});

// On charge le contenu de la page web
const loader = new CheerioWebBaseLoader("https://js.langchain.com/docs/integrations/document_loaders/web_loaders/spider/");
//const loader = new CheerioWebBaseLoader("https://www.20minutes.fr/monde/4149667-20250421-mort-pape-francois-vatican-revele-causes-mort-pontife-victime-avc-foudroyant");


const docs = await loader.load();
console.log(docs);

// On découpe le contenu de la page web en morceaux de 250 caractères
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 250,
    chunkOverlap: 50,
});

// On découpe les documents en morceaux
const splittedDocs = await splitter.splitDocuments(docs);
console.log(splittedDocs);

// On met en place les embeddings
const ollamaEmbeddings = new OllamaEmbeddings({
    model: "llama3.2:3b",
    baseUrl: "http://127.0.0.1:11434",
});

/* const openaiEmbeddings = new OpenAIEmbeddings({
    apiKey: xxx,
}); */

// On crée le vector store
const vectorStore = await MemoryVectorStore.fromDocuments(splittedDocs, ollamaEmbeddings);

const retriever = vectorStore.asRetriever({
    k: 2,
});

const retrievalChain = await createRetrievalChain({
    combineDocsChain: chain,
    retriever,
});

const response = await retrievalChain.invoke({
    input: "What is spider web loader?",
});

/*const response = await retrievalChain.invoke({
    input: "De quoi est mort le pape?",
});*/

console.log(response);
