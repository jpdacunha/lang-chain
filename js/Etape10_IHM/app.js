import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
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

const llm = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7
});

const instructions = `
    Instructions:
    1. Base your response only on the movies provided in the context
    2. Consider the similarity scores when weighing the relevance of each document from context but don't reference it in your response
    3. Give a response as short as possible using only one word or one sentence
    4. If the context doesn't provide enough information, acknowledge this limitation
`;

const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Answer the user's question based only on the following {context}. Only use information from the provided context. If the context doesn't contain enough information to answer fully, acknowledge this limitation."], 
    ["system", instructions],
    new MessagesPlaceholder("chat_history"),
    ["user", "User Question: {input}"],
]);

const chain = await createStuffDocumentsChain({
    prompt,
    llm
});

const pdfLoader = new PDFLoader("documents/test.pdf");
const pdfDocs = await pdfLoader.load();
console.log("> pdfDocs -----------------------------------------");
console.log(pdfDocs);
console.log("< pdfDocs -----------------------------------------");

const loader = new CheerioWebBaseLoader("https://js.langchain.com/docs/integrations/document_loaders/web_loaders/spider/");
const docs = await loader.load();
console.log("> docs -----------------------------------------");
console.log(docs);
console.log("< docs -----------------------------------------");

const allDocs = [...pdfDocs, ...docs];
console.log("> allDocs -----------------------------------------");
console.log(allDocs);
console.log("< allDocs -----------------------------------------");

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 150,
});
const splittedDocs = await splitter.splitDocuments(allDocs);

console.log("> splittedDocs -----------------------------------------");
console.log(splittedDocs);
console.log("< splittedDocs -----------------------------------------");

//Embeddings need to match the selected IA llama = OllamaEmbeddings, Mistral = MistralEmbeddings, etc.
const ollamaEmbeddings = new OllamaEmbeddings({
    model: "llama3.2:3b",
    baseUrl: "http://127.0.0.1:11434",
});

const vectorStore = await MemoryVectorStore.fromDocuments(splittedDocs, ollamaEmbeddings);

const retriever = vectorStore.asRetriever({
    k: 4,
    minSimilarityScore: 0.8,
});

const rephrasePrompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
    ["user", "Given the above conversation, generate a search query to look up to get information relevant to the conversation."],
]);

const historyAwareRetriever = await createHistoryAwareRetriever({
    retriever,
    chatHistorySize: 2,
    llm,
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

    console.log(">> response -----------------------------------------");
    console.log(response);
    console.log("<< response -----------------------------------------");

    chatHistory.push(new AIMessage(response.answer));
    
    res.json({ response: response.answer });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
