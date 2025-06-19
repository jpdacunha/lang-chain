import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { ChatOllama } from "@langchain/ollama";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import express from 'express';
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

// Add CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.static('.'));
app.use(express.json());

async function generateSimplifiedFALCDocument(pdfDocs, llm) {
    const pdfText = pdfDocs.map(doc => doc.pageContent).join("\n");

    const simplificationPrompt = `
    Simplify the following text according to the FALC (Easy to Read and Understand) principles.
    Use short sentences, simple vocabulary, and explain difficult words if necessary.
    Make the content accessible to people with cognitive disabilities or reading difficulties.
    Respond with the simplified text only, without any additional comments or explanations.
    Use only information from the provided context. Don't use your own knowledge or assumptions.

    Text:
    ${pdfText}
    `;

    const simplifiedResponse = await llm.invoke(simplificationPrompt);
    const simplifiedText = simplifiedResponse.content || simplifiedResponse;

    return {
        pageContent: simplifiedText,
        metadata: { source: "pdf_falc_simplified" }
    };
}


const ollamaLLM = new ChatOllama({
    model: process.env.OLLAMA_MODEL_NAME || "llama3.2:3b",
    baseUrl: "http://127.0.0.1:11434",
    temperature: 0.7,
});

const groqLLM = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7,
});

const instructions = `
Instructions:
1. Base your response only on the informations provided in the context
2. Consider the similarity scores when weighing the relevance of each document from context but don't reference it in your response
3. Give a response as short as possible using only one word or one sentence
4. If the context doesn't provide enough information, acknowledge this limitation
5. Only use information from the provided context. If the context doesn't contain enough information to answer fully, acknowledge this limitation.
`;

const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Answer the user's question based only on the following {context}."],
    ["system", instructions],
    new MessagesPlaceholder("chat_history"),
    ["user", "User Question: {input}"],
]);

const chain = await createStuffDocumentsChain({
    prompt,
    llm: groqLLM
});

const pdfLoader = new PDFLoader("documents/test.pdf");
const pdfDocs = await pdfLoader.load();
console.log("> 01 pdfDocs / Loading raw documents -----------------------------------------");
console.log(pdfDocs);
console.log("< 01 pdfDocs -----------------------------------------");

console.log("> 02 Generating simplified text for docs ---------------------------");
const simplifiedDoc = await generateSimplifiedFALCDocument(pdfDocs, ollamaLLM);
console.log("< 02 Generating simplified text for docs ---------------------------");


console.log("> 03 allDocs / Merging docs original + simplified ---------------------------");
const allDocs = [...pdfDocs, simplifiedDoc];
console.log(allDocs);
console.log("< 03 allDocs -----------------------------------------");

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 150,
});
const splittedDocs = await splitter.splitDocuments(allDocs);
console.log("> 04 splittedDocs / Splitting documents-----------------------------------------");
console.log(splittedDocs);
console.log("< 04 splittedDocs -----------------------------------------");

console.log("> 05 Embeddings / Using ollama to generate embeddings-----------------------------------------");
const ollamaEmbeddings = new OllamaEmbeddings({
    model: process.env.OLLAMA_MODEL_NAME || "llama3.2:3b",
    baseUrl: "http://127.0.0.1:11434",
});

const vectorStore = await MemoryVectorStore.fromDocuments(splittedDocs, ollamaEmbeddings);

const retriever = vectorStore.asRetriever({
    k: 4,
    minSimilarityScore: 0.8,
});
console.log("> 05 Embeddings -----------------------------------------");

const rephrasePrompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
    ["user", "Given the above conversation, generate a search query to look up to get information relevant to the conversation."],
]);

const historyAwareRetriever = await createHistoryAwareRetriever({
    retriever,
    chatHistorySize: 2,
    llm: groqLLM,
    rephrasePrompt,
});

const conversationChain = await createRetrievalChain({
    combineDocsChain: chain,
    retriever: historyAwareRetriever,
});

let chatHistory = [];

app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;

    chatHistory.push(new HumanMessage(userMessage));

    const response = await conversationChain.invoke({
        input: userMessage,
        chat_history: chatHistory,
    });

    chatHistory.push(new AIMessage(response.answer));

    res.json({ response: response.answer });
});

app.listen(port, () => {
    console.log(`STARTED : Server running at http://localhost:${port}`);
});