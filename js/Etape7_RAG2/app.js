
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
import { HtmlToTextTransformer } from "@langchain/community/document_transformers/html_to_text";

// Importer les variables d'environnement
dotenv.config();

const chat = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7
});

const prompt = ChatPromptTemplate.fromTemplate(`
    Answer the user's question based on the context provided.
    Context: {context}
    Question: {question}
`);

const chain = await createStuffDocumentsChain({
    llm: chat,
    prompt: prompt,
});

//Charge le contenu d'une page web
// Le contenu de la page est chargé dans un tableau de documents
const loader = new CheerioWebBaseLoader("https://www.bfmtv.com/societe/religions/direct-mort-du-pape-francois-sa-depouille-va-etre-exposee-a-saint-pierre-pour-l-hommage-des-fideles_LN-202504230057.html");
const docs = await loader.load();

console.log(docs);

//On découpe le document en morceaux plus petits de 250 tokens avec un recouvrement de 50 tokens
// Cela permet de mieux gérer les limites de tokens des modèles de langage
const text_splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 250,
    chunkOverlap: 50,
});

// Le fait de separer les documents en morceaux plus petits permet d'améliorer la qualité des réponses
// et de réduire le coût d'API (Moins de tokens à traiter)
// En effet, le modèle de langage est limité à 4096 tokens (environ 3000 mots) par appel d'API. 
// En splittant on ne va transmettre que les morceaux les plus pertinents
const splittedDocs = await text_splitter.splitDocuments(docs);

console.log(splittedDocs);

//On créé un vecteur de documents en utilisant les embeddings d'Ollama
// On utilise le modèle "llama3.2:3b" qui est un modèle de langage de type LLaMA
const ollamaEmbeddings = new OllamaEmbeddings({
    model: "llama3.2:3b",
    baseUrl: "http://localhost:11434",
});

//On créé un vecteur store de documents en utilisant les embeddings d'Ollama
const vectorstores = await MemoryVectorStore.fromDocuments(splittedDocs, ollamaEmbeddings);

const retriever = vectorstores.asRetriever({
    k: 3, // Nombre de documents à renvoyer maximum 
});

const retrievalChain = createRetrievalChain({
    combineDocsChain: chain,
    retriever: retriever,
});

const response = await retrievalChain.invoke({
    question: "Quand est mort le pape ?",
});

console.log(response);
